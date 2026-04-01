import os
import logging
import edge_tts

log = logging.getLogger(__name__)

# Voice mapping for EDGE-TTS
# Krishna uses Hindi voice (hi-IN-MadhurNeural) for authentic Hinglish delivery
# 'Madhur' means 'sweet' — perfect for Krishna's gentle, loving tone
VOICE_MAP = {
    "krishna": "hi-IN-MadhurNeural",
    "chanakya": "hi-IN-MadhurNeural",
    "laxmibai": "hi-IN-SwaraNeural",
    "default": "en-US-AndrewMultilingualNeural"
}

async def generate_speech_bytes(text: str, persona: str) -> bytes:
    """Uses edge-tts to generate speech and return audio bytes (mp3).
    Tuned for natural, warm conversational pacing."""
    voice = VOICE_MAP.get(persona, VOICE_MAP["default"])
    
    # Slightly slower rate + deeper pitch = calm, wise, human cadence
    communicate = edge_tts.Communicate(text, voice, rate="-6%", pitch="-3Hz")
    
    audio_data = bytearray()
    
    try:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
    except Exception as e:
        log.error(f"TTS generation error: {e}")
            
    return bytes(audio_data)
