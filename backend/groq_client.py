"""
Compatibility layer: forwards all calls to gemini_client.py.
This ensures full backward-compatibility with any legacy imports.
"""
from gemini_client import (
    MODEL,
    generate_persona_response,
    stream_persona_response,
    transcribe_audio_async,
)

__all__ = [
    "MODEL",
    "generate_persona_response",
    "stream_persona_response",
    "transcribe_audio_async",
]
