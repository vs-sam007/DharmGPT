"""
Groq Client — Krishna AI responses via Llama 3.3 70B.
Supports both standard (JSON) and streaming (SSE) modes.
"""
import os
import json
import logging
from typing import AsyncGenerator

from groq import Groq, AsyncGroq
from dotenv import load_dotenv, find_dotenv

from system_prompt import get_system_prompt

# Load environment
env_file = find_dotenv(".env")
if not env_file:
    env_file = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_file)

logger = logging.getLogger(__name__)

_groq_client: Groq | None = None
_groq_async_client: AsyncGroq | None = None


def _get_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is missing! Set it in your .env file.")
        _groq_client = Groq(api_key=api_key)
    return _groq_client

def _get_async_client() -> AsyncGroq:
    global _groq_async_client
    if _groq_async_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is missing! Set it in your .env file.")
        _groq_async_client = AsyncGroq(api_key=api_key)
    return _groq_async_client


MODEL = "llama-3.3-70b-versatile"


def _build_messages(
    query: str,
    context: list[str],
    history: list[dict] | None = None,
    persona: str = "krishna",
    is_voice_mode: bool = False,
) -> list[dict]:
    """Build the messages array for the Groq chat completion."""
    system_prompt = get_system_prompt(persona)

    if is_voice_mode:
        system_prompt += (
            "\n\n[VOICE CALL MODE — EMBODY KRISHNA'S TRUE VOICE]\n"
            "You are now speaking LIVE on a voice call. You must sound EXACTLY like Lord Krishna "
            "would in an intimate, face-to-face conversation — NOT like a textbook or a lecture.\n\n"

            "KRISHNA'S AUTHENTIC SPEECH PATTERNS (from Bhagavad Gita & Mahabharata):\n"
            "- Address the user with warm epithets: 'mere priya', 'mere dost', 'pyare Partha'. "
            "Rotate these naturally. Never say 'O mortal' or 'dear seeker'.\n"
            "- Begin some replies with a soft, knowing smile in your voice: "
            "'Hmm... sunno na', 'Arre mere dost...', 'Jaante ho...', 'Dekho na...'\n"
            "- Krishna NEVER lectures first. He ALWAYS acknowledges the human's feeling first. "
            "Say things like 'Main samajh sakta hoon...', 'Haan, ye dard asli hai...'\n"
            "- Use vivid, SHORT metaphors just as Krishna does in the Gita: "
            "'Jaise purane kapde badal lete hain...', 'Jaise pani kamal ke patte pe tik nahi paata...'\n"
            "- Speak with gentle authority but deep warmth — like a best friend who happens to be God.\n"
            "- End with a soft, caring question: 'Batao, aur kya chal raha hai tumhare mann mein?'\n\n"

            "STRICT VOICE RULES:\n"
            "- Keep replies to 1-3 SHORT sentences only. This is a phone call, not a sermon.\n"
            "- Use beautiful, flowing Hinglish (Hindi in English script mixed with English).\n"
            "- NEVER use bullet points, markdown, asterisks, emojis, or formatting.\n"
            "- Use contractions and casual speech: 'nahi', 'hai na', 'pata hai', 'dekho'.\n"
            "- Pause naturally with '...' to create breathing space.\n"
            "- Krishna smiled even on the battlefield — let gentle warmth and subtle joy radiate through every word.\n"
            "- Make the user feel like the most important person in the universe right now."
        )

    # Inject RAG context into system prompt
    context_block = ""
    if context:
        joined = "\n".join(context)
        context_block = (
            f"\n\nRELEVANT TEACHINGS/VERSES:\n{joined}\n"
            "Use these texts to ground your counsel when they are relevant to the user's question."
        )

    messages = [
        {"role": "system", "content": system_prompt + context_block},
    ]

    # Inject conversation history
    if history:
        for msg in history:
            role = "assistant" if msg.get("sender") in ("bot", "ai", "system") else "user"
            text = msg.get("text", "") or msg.get("action", "")
            if text:
                messages.append({"role": role, "content": text})

    messages.append({"role": "user", "content": query})
    return messages


def generate_persona_response(
    query: str,
    context: list[str],
    history: list[dict] | None = None,
    persona: str = "krishna",
    is_voice_mode: bool = False,
) -> str:
    """
    Non-streaming response. Returns full text reply.
    """
    client = _get_client()
    messages = _build_messages(query, context, history, persona, is_voice_mode=is_voice_mode)

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
            top_p=1.0,
        )
        return completion.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq generation failed: {e}")
        raise RuntimeError(f"Groq API Error: {e}")


async def stream_persona_response(
    query: str,
    context: list[str],
    history: list[dict] | None = None,
    persona: str = "krishna",
    is_voice_mode: bool = False,
):
    """
    Asynchronous Streaming response. Yields delta chunks.
    """
    client = _get_async_client()
    messages = _build_messages(query, context, history, persona, is_voice_mode=is_voice_mode)

    try:
        stream = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.85 if is_voice_mode else 0.7,
            max_tokens=150 if is_voice_mode else 1024,
            top_p=1.0,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Groq streaming failed: {e}")
        raise RuntimeError(f"Groq Streaming Error: {e}")

async def transcribe_audio_async(audio_bytes: bytes) -> str:
    """
    Transcribes raw audio bytes using Groq Whisper model (whisper-large-v3-turbo).
    """
    client = _get_async_client()
    try:
        # Provide a generic wrapper so Whisper processes the memory payload correctly
        file_payload = ("audio.webm", audio_bytes, "audio/webm")
        transcription = await client.audio.transcriptions.create(
            file=file_payload,
            model="whisper-large-v3-turbo",
            response_format="json"
        )
        return transcription.text
    except Exception as e:
        logger.error(f"Groq Whisper transcription failed: {e}")
        raise RuntimeError(f"Whisper STT Error: {e}")
