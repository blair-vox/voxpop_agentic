"""Persona Chat agent stub."""

from typing import Dict, Any, List


CHAT_HISTORY_LIMIT = 20


def chat(persona: Dict[str, Any], message_history: List[Dict[str, str]]) -> Dict[str, str]:
    """Return chat response from persona (noop)."""
    # TODO: integrate with conversational LLM
    return {"response": "This is a placeholder response."} 