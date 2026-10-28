"""
Krishna AI Chatbot — FastAPI Backend
Uses Groq (Llama 3.3 70B) for text generation with RAG from ChromaDB.
"""
import os
import json
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from rag.chroma_client import get_persona_collection
from groq_client import generate_persona_response, stream_persona_response, stream_persona_response
from services.redis_cache import get_cached_response, set_cached_response
from services.voice_engine import generate_speech_bytes

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Krishna AI Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request / Response Models ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str
    query: str
    persona: str = "krishna"
    history: list[dict] = []

class ChatResponse(BaseModel):
    response: str
    retrieved_chunks: int

class TokenRequest(BaseModel):
    room_name: str
    participant_name: str
    persona: str = "krishna"

# ─── Health ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "DharmaGPT Backend",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
def health_check():
    return {"status": "sacred parameters online"}

# ─── Voice Session (Local Stack) ───────────────────────────────────────────

@app.websocket("/ws/voice/{persona}")
async def voice_session(websocket: WebSocket, persona: str):
    await websocket.accept()
    logger.info(f"Voice session started for persona: {persona}")
    try:
        from groq_client import transcribe_audio_async
        
        while True:
            data = await websocket.receive()
            
            user_text = ""
            via_whisper = False
            
            # FastAPI receive() always returns both keys, so we must check the VALUE is not None
            audio_bytes = data.get("bytes")
            text_data = data.get("text")
            
            if audio_bytes is not None:
                # Binary blob received from MediaRecorder — send to Whisper
                logger.info(f"[{persona}] Received {len(audio_bytes)} bytes of audio. Transcribing via Whisper...")
                await websocket.send_json({"type": "agent_thinking"})
                try:
                    user_text = await transcribe_audio_async(audio_bytes)
                    logger.info(f"[{persona}] Whisper Transcribed: {user_text}")
                    # Sync corrected text back to the frontend UI
                    await websocket.send_json({"type": "user_transcription", "text": user_text})
                    via_whisper = True
                except Exception as e:
                    logger.error(f"Whisper transcription error: {e}")
                    await websocket.send_json({"type": "session_error", "message": "Transcription failed."})
                    await websocket.send_json({"type": "agent_done"})
                    continue
                    
            elif text_data is not None:
                # JSON control message received
                try:
                    payload = json.loads(text_data)
                    msg_type = payload.get("type", "")
                    if msg_type == "interrupt":
                        logger.info(f"[{persona}] Received interrupt signal.")
                        continue
                    if msg_type == "user_text":
                        # Fallback text-only path (used if Whisper is not available)
                        user_text = payload.get("text", "")
                        logger.info(f"[{persona}] Received Text Fallback: {user_text}")
                        await websocket.send_json({"type": "agent_thinking"})
                except Exception:
                    continue
            else:
                continue

            if not user_text or not user_text.strip():
                # If whisper returned empty string or noise
                logger.info(f"[{persona}] Ignored empty transcription.")
                continue

            # agent_thinking already sent in the binary/text branches above
                
            # We don't need to send the text back to the transcript because the frontend renders it live!
            
            # SKIP RAG in voice mode — it adds 200-500ms of blocking latency.
            # The persona system prompt already has enough context for short voice replies.
            context = []

            import re
            import asyncio
            
            buffer = ""
            # Split on sentence endings, or commas in long clauses for faster first-chunk delivery
            sentence_end = re.compile(r'[.?!]\s|[.?!]$|\n')
            md_chars = re.compile(r'[*_#`\[\]]')
            
            async def flush_chunk(text):
                """Send a text+audio chunk to the frontend.
                Text is sent IMMEDIATELY (unblocks UI). TTS is generated concurrently with a timeout."""
                cleaned = md_chars.sub('', text).strip()
                if not cleaned:
                    return
                # 1. Send the text RIGHT NOW so the transcript updates instantly
                await websocket.send_json({"type": "agent_speaking", "text": cleaned + " "})
                # 2. Generate TTS with a 5-second timeout — don't hang everything if Microsoft is slow
                try:
                    audio = await asyncio.wait_for(
                        generate_speech_bytes(cleaned, persona),
                        timeout=5.0
                    )
                    if audio:
                        await websocket.send_bytes(audio)
                except asyncio.TimeoutError:
                    logger.warning(f"TTS timed out for: {cleaned[:40]}...")
                except Exception as e:
                    logger.error(f"TTS error: {e}")
            
            async for chunk in stream_persona_response(user_text, context, [], persona, is_voice_mode=True):
                buffer += chunk
                
                # Primary: split on sentence boundaries
                match = sentence_end.search(buffer)
                while match:
                    split_idx = match.end()
                    sentence = buffer[:split_idx].strip()
                    buffer = buffer[split_idx:]
                    if sentence:
                        await flush_chunk(sentence)
                    match = sentence_end.search(buffer)
                
                # Secondary: split on commas if the buffer is getting long (faster first chunk)
                if len(buffer) > 50 and ', ' in buffer:
                    last_comma = buffer.rfind(', ')
                    clause = buffer[:last_comma + 1].strip()
                    buffer = buffer[last_comma + 2:]
                    if clause:
                        await flush_chunk(clause)
            
            # Flush remaining
            if buffer.strip():
                await flush_chunk(buffer)
            
            await websocket.send_json({"type": "agent_done"})

    except WebSocketDisconnect:
        logger.info(f"Voice session disconnected: {persona}")
    except Exception as e:
        logger.error(f"Voice session error: {e}")
        try:
            await websocket.send_json({"type": "session_error", "message": str(e)})
        except:
            pass

# ─── Chat Endpoint (Non-streaming) ─────────────────────────────────────────

@app.post("/ask", response_model=ChatResponse)
async def ask_persona(request: ChatRequest):
    logger.info(f"[ask] persona={request.persona} session={request.session_id} query={request.query[:50]}...")

    # Check cache
    cached = get_cached_response(request.session_id, request.query, request.persona)
    if cached:
        logger.info("Cache hit!")
        return ChatResponse(**cached)

    # RAG retrieval
    context = _retrieve_context(request.query, request.persona)

    # Generate via Groq
    try:
        import anyio
        response_text = await anyio.to_thread.run_sync(
            generate_persona_response,
            request.query,
            context,
            request.history,
            request.persona,
        )
    except Exception as e:
        logger.error(f"Groq generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    response_data = {
        "response": response_text,
        "retrieved_chunks": len(context),
    }

    # Cache and return
    set_cached_response(request.session_id, request.query, request.persona, response_data)
    return ChatResponse(**response_data)

# ─── Chat Endpoint (Streaming via SSE) ─────────────────────────────────────

@app.get("/chat/stream")
async def stream_chat(
    query: str = Query(..., description="User's question"),
    session_id: str = Query("default", description="Session ID"),
    persona: str = Query("krishna", description="The selected persona (e.g., krishna, chanakya)"),
):
    """
    Server-Sent Events (SSE) streaming endpoint.
    Frontend connects with EventSource or fetch().
    """
    logger.info(f"[stream] persona={persona} session={session_id} query={query[:50]}...")

    # RAG retrieval
    context = _retrieve_context(query, persona)

    async def event_generator():
        try:
            async for chunk in stream_persona_response(query, context, None, persona):
                if chunk:
                    # SSE format: data: <text>\n\n
                    yield f"data: {json.dumps({'text': chunk})}\n\n"

            # Signal end of stream
            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Helpers ────────────────────────────────────────────────────────────────

def _retrieve_context(query: str, persona: str = "krishna") -> list[str]:
    """Retrieve relevant verses from ChromaDB for the persona."""
    context = []
    try:
        collection = get_persona_collection(persona)
        results = collection.query(query_texts=[query], n_results=3)
        if results["documents"] and results["documents"][0]:
            context = results["documents"][0]
    except Exception as e:
        logger.warning(f"ChromaDB retrieval failed: {e}")
    return context
