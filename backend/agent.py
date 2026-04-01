"""
DharmaGPT — LiveKit Agent Session Handler
==========================================

This is the heart of the backend. One instance of DharmaAgent runs per user session.

Flow:
  1. User connects to a LiveKit room (via the Next.js frontend)
  2. LiveKit dispatches a new agent instance for that room
  3. Agent opens a Gemini Flash Live WebSocket session
  4. Audio flows:  LiveKit room → agent → Gemini (mic PCM @ 16kHz)
                   Gemini → agent → LiveKit room (speech PCM @ 24kHz)
  5. When Gemini needs a verse (ToolCall), we query ChromaDB and respond
  6. Persona is set per session via the classifier before audio begins

Key design decisions:
  - ONE Gemini session per LiveKit room (not per utterance)
  - Gemini context cache is pre-loaded at startup (one-time cost per persona)
  - Interruption is handled by catching the ToolCallCancel event from Gemini
  - All data to/from the frontend is via LiveKit DataChannels (topics: dharma-audio, dharma-signal)
"""

import os
import asyncio
import json
import logging
import struct
import time
from dataclasses import dataclass, field
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli

_LIVEKIT_AVAILABLE = True

log = logging.getLogger("dharmagpt.agent")

from google import genai
from google.genai import types

from classifier import classify_dilemma, PersonaResult
from rag.retriever import retrieve_verses, VerseResult
from personas.registry import PERSONA_REGISTRY, PersonaConfig

# ─── Constants ────────────────────────────────────────────────────────────────

AUDIO_CHANNEL  = "dharma-audio"
SIGNAL_CHANNEL = "dharma-signal"

GEMINI_MODEL       = "gemini-3.1-flash-live-preview"
GEMINI_SAMPLE_RATE = 24000   # Hz — Gemini output sample rate
MIC_SAMPLE_RATE    = 16000   # Hz — what we send to Gemini
AUDIO_CHUNK_HEADER = 1       # bytes — strip the 0x01 prefix the frontend adds

MAX_SESSION_MINUTES = int(os.getenv("MAX_SESSION_MINUTES", "15"))

# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class SessionState:
    persona: Optional[PersonaConfig] = None
    gemini_session: object = None           # google.generativeai AsyncSession
    room: Optional[rtc.Room] = None
    participant: Optional[rtc.RemoteParticipant] = None
    is_speaking: bool = False
    session_start: float = field(default_factory=time.time)
    last_verse: Optional[VerseResult] = None
    interrupted: bool = False

# ─── Gemini Tool Definition ───────────────────────────────────────────────────
# This is what Gemini calls when it needs a verse before responding.
# The schema must match what retrieve_verses() returns.

SEARCH_VERSE_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="search_dharmic_verse",
            description=(
                "Search the Bhagavad Gita, Mahabharata, and Vidura Niti for verses "
                "relevant to the user's dilemma. Always call this before responding "
                "to ensure your answer is grounded in the sacred texts."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "query": types.Schema(
                        type="STRING",
                        description="The user's dilemma or question in plain English",
                    ),
                    "themes": types.Schema(
                        type="ARRAY",
                        items=types.Schema(type="STRING"),
                        description=(
                            "Relevant dharmic themes: karma, dharma, moksha, bhakti, "
                            "duty, anger, grief, justice, sacrifice, ego"
                        ),
                    ),
                },
                required=["query"],
            ),
        )
    ]
)

# ─── Agent Class ──────────────────────────────────────────────────────────────

class DharmaAgent:
    """
    One instance per LiveKit room session.
    Manages the full lifecycle: connect → classify → stream audio ↔ Gemini → disconnect.
    """

    def __init__(self, ctx: JobContext):
        self.ctx = ctx
        self.state = SessionState()
        self._client = genai.Client(api_key=os.environ["GEMINI_API_KEY"], http_options={'api_version': 'v1alpha'})
        self._audio_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=512)
        self._tasks: list[asyncio.Task] = []

    # ─── Entry point ──────────────────────────────────────────────────────────

    async def run(self):
        """Called by LiveKit when a participant joins a room."""
        room = self.ctx.room
        self.state.room = room

        log.info(f"[{room.name}] Agent started")

        # Wait for the user participant to join (with 30s timeout)
        try:
            participant = await asyncio.wait_for(
                self._wait_for_participant(room), timeout=30.0
            )
        except asyncio.TimeoutError:
            log.warning(f"[{room.name}] No participant joined within 30s, exiting")
            return

        self.state.participant = participant
        log.info(f"[{room.name}] Participant {participant.identity} connected")

        self._session_start_event = asyncio.Event()
        self._requested_persona = "krishna"

        # Wire up data channel handler
        room.on("data_received", self._on_data_received)

        # Send the "ready" signal so the frontend shows the orb
        await self._send_signal({"type": "agent_ready"})

        # Wait for the session_start signal from frontend before opening Gemini
        # (persona classification happens first)
        try:
            await asyncio.wait_for(self._wait_for_session_start(), timeout=60.0)
        except asyncio.TimeoutError:
            log.warning(f"[{room.name}] session_start never received")
            return

        # Start the main processing pipeline
        await self._run_pipeline()

    async def _wait_for_participant(self, room: rtc.Room) -> rtc.RemoteParticipant:
        future: asyncio.Future = asyncio.get_event_loop().create_future()

        def on_participant_connected(p: rtc.RemoteParticipant):
            if not future.done():
                future.set_result(p)

        room.on("participant_connected", on_participant_connected)

        # Check if someone is already in the room
        for p in room.remote_participants.values():
            if not future.done():
                future.set_result(p)

        return await future

    # ─── Session start + classification ───────────────────────────────────────

    _session_start_event: asyncio.Event = None  # type: ignore
    _first_utterance: Optional[str] = None

    async def _wait_for_session_start(self):
        await self._session_start_event.wait()

    def _on_session_start(self, payload: dict):
        """Frontend sends session_start — we begin Gemini connection."""
        self._requested_persona = payload.get("persona", "krishna")
        self._session_start_event.set()

    # ─── Main pipeline ────────────────────────────────────────────────────────

    async def _run_pipeline(self):
        """
        Opens the Gemini Live session and runs three concurrent loops:
          1. Audio ingestion  — frontend audio → Gemini
          2. Response handler — Gemini audio/events → frontend
          3. Session watchdog — enforces MAX_SESSION_MINUTES
        """
        room = self.state.room

        # Start with the persona requested by the user
        persona_id = self._requested_persona
        persona = PERSONA_REGISTRY.get(persona_id, PERSONA_REGISTRY["krishna"])
        self.state.persona = persona
        await self._send_persona_signal(persona, confidence=1.0)

        live_config = self._build_live_config(persona)

        log.info(f"[{room.name}] Opening Gemini session with persona: {persona.name}")

        async with self._client.aio.live.connect(
            model=GEMINI_MODEL,
            config=live_config,
        ) as session:
            self.state.gemini_session = session
            log.info(f"[{room.name}] Gemini session open")

            await asyncio.gather(
                self._audio_ingestion_loop(session),
                self._response_handler_loop(session),
                self._session_watchdog(),
                return_exceptions=True,
            )

        log.info(f"[{room.name}] Gemini session closed")

    def _build_live_config(self, persona: PersonaConfig) -> types.LiveConnectConfig:
        """Build the Gemini session config for a given persona."""
        return types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=persona.gemini_voice
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part(text=persona.system_prompt)]
            ),
            tools=[SEARCH_VERSE_TOOL],
        )

    # ─── Audio ingestion loop ─────────────────────────────────────────────────

    async def _audio_ingestion_loop(self, session):
        """
        Pulls raw PCM chunks from the queue (fed by _on_data_received)
        and streams them to Gemini.

        Runs until the session ends or the queue receives a sentinel None.
        """
        log.info("Audio ingestion loop started")
        while True:
            chunk = await self._audio_queue.get()
            if chunk is None:  # Sentinel — shutdown
                break
            try:
                await session.send(
                    input={"data": chunk, "mime_type": "audio/pcm"},
                    end_of_turn=False,  # Gemini's VAD decides when the turn ends
                )
            except Exception as e:
                log.warning(f"Audio send error: {e}")

    # ─── Response handler loop ────────────────────────────────────────────────

    async def _response_handler_loop(self, session):
        """
        Receives events from Gemini and routes them:
          - Audio data     → forward to frontend via LiveKit DataChannel
          - ToolCall       → query ChromaDB → send ToolResponse back
          - ToolCallCancel → user interrupted, abort
          - Text           → ignore (we're audio-only)
        """
        log.info("Response handler loop started")

        async for response in session.receive():

            # ── Audio chunk from Gemini ──────────────────────────────────────
            if response.data:
                if not self.state.is_speaking:
                    self.state.is_speaking = True
                    await self._send_signal({"type": "agent_speaking"})

                await self._forward_audio_to_frontend(response.data)

            # ── Turn complete (Gemini finished speaking) ──────────────────────
            if response.server_content and response.server_content.turn_complete:
                self.state.is_speaking = False
                self.state.interrupted = False
                await self._send_signal({"type": "agent_done"})
                log.debug("Turn complete")

            # ── Tool call (Gemini wants a verse) ──────────────────────────────
            if response.tool_call:
                for fn_call in response.tool_call.function_calls:
                    if fn_call.name == "search_dharmic_verse":
                        await self._handle_verse_search(session, fn_call)

            # ── Tool call cancelled (user interrupted) ────────────────────────
            if response.tool_call_cancellation:
                log.info("Tool call cancelled — user interrupted")
                self.state.is_speaking = False
                self.state.interrupted = True

    # ─── Verse search tool handler ────────────────────────────────────────────

    async def _handle_verse_search(self, session, fn_call):
        """
        Called when Gemini decides it needs a verse before responding.
        1. Run ChromaDB retrieval (filtered by active persona)
        2. Send the verse back to Gemini as a ToolResponse
        3. Also send the verse to the frontend so it shows in the UI
           before the agent starts speaking (zero-perceived-latency)
        """
        args = dict(fn_call.args)
        query = args.get("query", "")
        themes = args.get("themes", [])

        log.info(f"Verse search: query='{query}' themes={themes}")

        # This should already be in Redis cache if speculative RAG fired
        verses = await retrieve_verses(
            query=query,
            persona=self.state.persona.id,
            themes=themes,
            top_k=3,
        )

        if not verses:
            # No verse found — tell Gemini to proceed from the spirit of the teaching
            tool_response_text = (
                "No specific verse was found for this query. "
                "Respond from the spirit of the teaching without citing a specific shloka."
            )
        else:
            best = verses[0]
            self.state.last_verse = best

            # Show verse in UI immediately (before agent starts speaking)
            await self._send_signal({
                "type": "verse_retrieved",
                "ref": best.reference,
                "verse": best.translation_en,
                "sanskrit_key": best.sanskrit_key,
            })

            # Format for Gemini's context
            tool_response_text = (
                f"Relevant verse found:\n"
                f"Source: {best.reference}\n"
                f"Sanskrit: {best.sanskrit_key}\n"
                f"Translation: {best.translation_en}\n\n"
                f"Use this verse as the foundation of your response. "
                f"Cite it at the start: 'In {best.reference}...'"
            )

            if len(verses) > 1:
                tool_response_text += f"\n\nAdditional context from {verses[1].reference}: {verses[1].translation_en[:200]}..."

        # Send tool result back to Gemini so it can continue
        await session.send(
            input={
                "tool_response": {
                    "function_responses": [{
                        "id": fn_call.id,
                        "name": fn_call.name,
                        "response": {"result": tool_response_text},
                    }]
                }
            }
        )

        log.info(f"Verse search complete, sent tool response")

    # ─── Persona switching ────────────────────────────────────────────────────

    async def _classify_and_switch_persona(self, utterance: str):
        """
        Run the classifier on the user's first utterance and switch
        the Gemini session's system prompt if the persona changes.

        Called from _on_data_received on the first audio end-of-turn.
        We run classification concurrently — Gemini may have already started
        processing, so we check if the persona actually changed before switching.
        """
        result: PersonaResult = await classify_dilemma(utterance)
        log.info(f"Classifier: persona={result.persona} confidence={result.confidence:.2f}")

        if result.persona == self.state.persona.id:
            return  # Already on the right persona

        new_persona = PERSONA_REGISTRY[result.persona]
        self.state.persona = new_persona

        # Notify frontend of persona switch
        await self._send_persona_signal(new_persona, result.confidence)

        # Update the Gemini session's system instruction for subsequent turns
        # Note: this does NOT restart the session — it updates the context in-place
        if self.state.gemini_session:
            try:
                await self.state.gemini_session.send(
                    input={
                        "setup": {
                            "system_instruction": new_persona.system_prompt,
                        }
                    }
                )
            except Exception as e:
                log.warning(f"Could not update system prompt in-session: {e}")

    # ─── Data channel handlers ────────────────────────────────────────────────

    def _on_data_received(self, data: bytes, participant: rtc.RemoteParticipant,
                          kind: rtc.DataPacket_Kind, topic: Optional[str]):
        """Called on the LiveKit event loop for every DataChannel message."""
        if topic == AUDIO_CHANNEL:
            # Strip the 1-byte 0x01 prefix the frontend adds
            pcm_chunk = data[AUDIO_CHUNK_HEADER:]
            try:
                self._audio_queue.put_nowait(pcm_chunk)
            except asyncio.QueueFull:
                log.warning("Audio queue full — dropping chunk")

        elif topic == SIGNAL_CHANNEL:
            try:
                signal = json.loads(data.decode())
                self._handle_frontend_signal(signal)
            except Exception as e:
                log.warning(f"Bad signal: {e}")

    def _handle_frontend_signal(self, signal: dict):
        sig_type = signal.get("type")

        if sig_type == "session_start":
            self._on_session_start(signal)

        elif sig_type == "user_interrupt":
            # User started speaking while agent was speaking
            # Flush the audio queue and tell Gemini to stop
            log.info("User interrupt received")
            self._flush_audio_queue()
            asyncio.create_task(self._send_interrupt_to_gemini())

        elif sig_type == "session_end":
            log.info("Frontend requested session end")
            self._audio_queue.put_nowait(None)  # Sentinel

    def _flush_audio_queue(self):
        while not self._audio_queue.empty():
            try:
                self._audio_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

    async def _send_interrupt_to_gemini(self):
        """
        Sending a new input mid-generation signals Gemini to stop.
        This is the correct way to interrupt — not closing the WebSocket.
        """
        if self.state.gemini_session:
            try:
                # v1.x style: send a LiveClientMessage with an empty chunk or control signal
                await self.state.gemini_session.send(
                    input=types.LiveClientMessageInput(
                        media_chunks=[types.Blob(data=b"", mime_type="audio/pcm")]
                    ),
                    end_of_turn=True,
                )
            except Exception as e:
                log.warning(f"Interrupt send error: {e}")

    # ─── Frontend forwarding ──────────────────────────────────────────────────

    async def _forward_audio_to_frontend(self, pcm_data: bytes):
        """
        Forward Gemini's audio response to the frontend via LiveKit DataChannel.
        Prefixes with 0x01 to match what the frontend expects.
        """
        room = self.state.room
        if not room:
            return

        payload = bytes([0x01]) + pcm_data
        try:
            await room.local_participant.publish_data(
                payload,
                kind=rtc.DataPacket_Kind.RELIABLE,
                topic=AUDIO_CHANNEL,
            )
        except Exception as e:
            log.warning(f"Audio forward error: {e}")

    async def _send_signal(self, payload: dict):
        """Send a JSON signal to the frontend via the signal DataChannel."""
        room = self.state.room
        if not room:
            return
        try:
            data = json.dumps(payload).encode()
            await room.local_participant.publish_data(
                data,
                kind=rtc.DataPacket_Kind.RELIABLE,
                topic=SIGNAL_CHANNEL,
            )
        except Exception as e:
            log.warning(f"Signal send error: {e}")

    async def _send_persona_signal(self, persona: PersonaConfig, confidence: float):
        await self._send_signal({
            "type": "persona_selected",
            "persona": persona.id,
            "ref": persona.display_ref,
            "verse": persona.greeting_verse,
            "confidence": round(confidence, 3),
        })

    # ─── Session watchdog ─────────────────────────────────────────────────────

    async def _session_watchdog(self):
        """
        Enforces the MAX_SESSION_MINUTES limit.
        At 13 minutes: warn the user with a closing verse.
        At 15 minutes: gracefully close the session.
        """
        warn_at = MAX_SESSION_MINUTES * 60 - 120  # 2 min warning
        end_at  = MAX_SESSION_MINUTES * 60

        await asyncio.sleep(warn_at)
        log.info("Session approaching time limit — sending closing verse")
        await self._send_signal({
            "type": "session_warning",
            "message": "The counsel draws to a close. Two minutes remain.",
        })

        await asyncio.sleep(120)
        log.info("Session time limit reached — closing")
        await self._send_signal({
            "type": "session_end",
            "verse": "Having heard all this, do with it as you will. — Bhagavad Gita 18.63",
        })
        self._audio_queue.put_nowait(None)  # Trigger shutdown


# ─── LiveKit Worker Entry Point ───────────────────────────────────────────────

async def entrypoint(ctx: JobContext):
    """
    Called by LiveKit when a new room needs an agent.
    Each room gets its own DharmaAgent instance.
    """
    await ctx.connect(auto_subscribe=agents.AutoSubscribe.SUBSCRIBE_ALL)
    agent = DharmaAgent(ctx)
    await agent.run()


async def run_agent(room_name: str, participant_id: str, persona: str = "krishna"):
    """
    Dispatcher for the LiveKit agent in a background task.
    In the current setup, we log the arrival and let the LiveKit worker take over.
    """
    log.info(f"Agent requested for room: {room_name} by participant: {participant_id} persona: {persona}")
    if not _LIVEKIT_AVAILABLE:
        log.error("Cannot start agent: livekit-agents not installed.")
        return
    # The worker is already running (via cli.run_app), but this satisfies the main.py call.

if __name__ == "__main__":
    if _LIVEKIT_AVAILABLE:
        cli.run_app(
            WorkerOptions(
                entrypoint_fnc=entrypoint,
                worker_type=agents.WorkerType.ROOM,
            )
        )
    else:
        print("Error: LiveKit SDK required to run the agent worker.")
