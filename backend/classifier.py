"""
classifier.py — Lightweight persona classifier for DharmaGPT voice agent.

In voice mode, the user's first utterance can optionally trigger a persona switch.
This is a simple keyword-based classifier — no LLM call needed.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class PersonaResult:
    persona: str
    confidence: float


KEYWORDS = {
    "chanakya": [
        "strategy", "politics", "power", "enemy", "revenge", "plan",
        "neeti", "chanakya", "kautilya", "arthashastra", "rajneeti",
    ],
    "laxmibai": [
        "fight", "courage", "war", "battle", "freedom", "independence",
        "brave", "warrior", "laxmibai", "jhansi", "swaraj", "revolution",
    ],
    "krishna": [
        "dharma", "karma", "gita", "krishna", "peace", "soul",
        "atma", "moksha", "duty", "arjuna", "bhagavad",
    ],
}


async def classify_dilemma(
    utterance: str,
    default_persona: str = "krishna",
) -> PersonaResult:
    """
    Classify an utterance into a persona using keyword matching.
    Returns the default persona if no strong signal is found.
    """
    text = utterance.lower()
    scores: dict[str, int] = {}

    for persona_id, words in KEYWORDS.items():
        score = sum(1 for w in words if w in text)
        if score > 0:
            scores[persona_id] = score

    if not scores:
        return PersonaResult(persona=default_persona, confidence=0.5)

    best = max(scores, key=scores.get)
    confidence = min(1.0, scores[best] / 3.0)
    return PersonaResult(persona=best, confidence=confidence)
