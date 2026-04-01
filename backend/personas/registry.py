"""
personas/registry.py — Persona configuration for DharmaGPT voice agent.

Each persona maps to:
  - A system prompt (loaded from prompts/<id>.md)
  - A Gemini voice preset
  - Display metadata for the frontend
"""
import os
from dataclasses import dataclass

PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


@dataclass
class PersonaConfig:
    id: str
    name: str
    display_ref: str
    greeting_verse: str
    gemini_voice: str
    system_prompt: str


def _load_prompt(persona_id: str) -> str:
    path = os.path.join(PROMPTS_DIR, f"{persona_id}.md")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return f"You are {persona_id}. Respond wisely in Hinglish."


PERSONA_REGISTRY: dict[str, PersonaConfig] = {
    "krishna": PersonaConfig(
        id="krishna",
        name="Lord Krishna",
        display_ref="Bhagavad Gita",
        greeting_verse="Whenever Dharma declines, I manifest Myself — Gita 4.7",
        gemini_voice="Puck",
        system_prompt=_load_prompt("krishna"),
    ),
    "chanakya": PersonaConfig(
        id="chanakya",
        name="Acharya Chanakya",
        display_ref="Chanakya Neeti",
        greeting_verse="A wise man keeps his counsel hidden — Chanakya Neeti 1.1",
        gemini_voice="Kore",
        system_prompt=_load_prompt("chanakya"),
    ),
    "laxmibai": PersonaConfig(
        id="laxmibai",
        name="Rani Laxmi Bai",
        display_ref="Declaration of Jhansi",
        greeting_verse="Main apni Jhansi nahi doongi — Rani Laxmi Bai",
        gemini_voice="Aoede",
        system_prompt=_load_prompt("laxmibai"),
    ),
}
