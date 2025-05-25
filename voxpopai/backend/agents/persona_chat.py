"""Minimal single-turn Persona-Chat helper."""
import os
from functools import lru_cache
from typing import Dict, Any
from openai import OpenAI

SYSTEM_PROMPT = (
    "You are the same synthetic persona who wrote the previous answer. "
    "Stay in character and answer the follow-up question briefly."
)

@lru_cache(1)
def _client() -> OpenAI:  # type: ignore
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def persona_chat(persona: Dict[str, Any], follow_up: str) -> str:
    """Return persona's reply to a follow-up prompt (1-2 sentences)."""
    persona_name = persona.get("id") or "Persona"
    persona_bio = f"Age {persona.get('age')}, {persona.get('gender')}, {persona.get('location')}"
    prompt = f"You are {persona_name}. {persona_bio}.\n\nFollow-up question:\n{follow_up}"
    res = _client().chat.completions.create(
        model="gpt-3.5-turbo",
        temperature=0.7,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=120,
    )
    return res.choices[0].message.content.strip() 