"""
Gemini Client — Krishna AI responses via Google Gemini.
Supports standard (JSON) responses, streaming (SSE), and audio transcription via Gemini Flash.
"""
import os
import json
import logging
from typing import AsyncGenerator

from google import genai
from google.genai import types
from system_prompt import get_system_prompt
try:
    from dotenv import load_dotenv, find_dotenv
    env_file = find_dotenv(".env")
    if not env_file:
        env_file = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(env_file)
except ImportError:
    pass

logger = logging.getLogger(__name__)

_gemini_client: genai.Client | None = None

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _get_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is missing! Set it in your .env file or Render dashboard.")
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def _build_prompt_and_contents(
    query: str,
    context: list[str],
    history: list[dict] | None = None,
    persona: str = "krishna",
    is_voice_mode: bool = False,
) -> tuple[str, list[types.Content]]:
    """Build the system instruction and contents array for Gemini."""
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

    # Inject RAG context into system instruction
    context_block = ""
    if context:
        joined = "\n".join(context)
        context_block = (
            f"\n\nRELEVANT TEACHINGS/VERSES:\n{joined}\n"
            "Use these texts to ground your counsel when they are relevant to the user's question."
        )

    full_system_instruction = system_prompt + context_block

    contents: list[types.Content] = []

    # Inject conversation history
    if history:
        for msg in history:
            role = "model" if msg.get("sender") in ("bot", "ai", "system", "assistant") else "user"
            text = msg.get("text", "") or msg.get("action", "")
            if text:
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))

    # Ensure conversation doesn't start with a model message
    while contents and contents[0].role == "model":
        contents.pop(0)

    # Append current user query
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=query)]))

    return full_system_instruction, contents


def generate_persona_response(
    query: str,
    context: list[str],
    history: list[dict] | None = None,
    persona: str = "krishna",
    is_voice_mode: bool = False,
) -> str:
    """
    Non-streaming response via Google Gemini. Returns full text reply.
    """
    client = _get_client()
    system_instruction, contents = _build_prompt_and_contents(
        query, context, history, persona, is_voice_mode=is_voice_mode
    )

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
                max_output_tokens=1024,
            ),
        )
        return response.text or ""
    except Exception as e:
        logger.error(f"Gemini generation failed: {e}")
        raise RuntimeError(f"Gemini API Error: {e}")


async def stream_persona_response(
    query: str,
    context: list[str],
    history: list[dict] | None = None,
    persona: str = "krishna",
    is_voice_mode: bool = False,
):
    """
    Asynchronous Streaming response via Google Gemini. Yields delta text chunks.
    """
    client = _get_client()
    system_instruction, contents = _build_prompt_and_contents(
        query, context, history, persona, is_voice_mode=is_voice_mode
    )

    try:
        response = await client.aio.models.generate_content_stream(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.85 if is_voice_mode else 0.7,
                max_output_tokens=150 if is_voice_mode else 1024,
            ),
        )
        async for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        logger.error(f"Gemini streaming failed: {e}")
        raise RuntimeError(f"Gemini Streaming Error: {e}")


async def transcribe_audio_async(audio_bytes: bytes) -> str:
    """
    Transcribes raw audio bytes using Google Gemini multimodal capabilities.
    """
    client = _get_client()
    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type="audio/webm"),
                "Accurately transcribe the spoken words in this audio into text. Return ONLY the transcribed text without any quotes, preamble, or metadata."
            ]
        )
        return response.text.strip() if response.text else ""
    except Exception as e:
        logger.error(f"Gemini audio transcription failed: {e}")
        raise RuntimeError(f"Gemini Transcription Error: {e}")
