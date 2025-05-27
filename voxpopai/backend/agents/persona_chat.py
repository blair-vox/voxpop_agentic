"""Minimal single-turn Persona-Chat helper."""
from typing import Dict, Any
from voxpopai.backend.utils.llm_wrapper import call_llm

SYSTEM_PROMPT = (
    "You are the same synthetic persona who wrote the previous answer. "
    "Stay in character and answer the follow-up question briefly."
)

def persona_chat(persona: Dict[str, Any], follow_up: str, run_id: str | None = None) -> str:
    """Return a short in-character reply from *persona*.

    The call is routed through :pyfunc:`voxpopai.backend.utils.llm_wrapper.call_llm`
    so that prompt/response pairs are persisted to the run log.
    """
    persona_name = persona.get("id") or "Persona"
    # Build a multi-line profile description for grounding
    profile_lines = []
    for k, v in persona.items():
        if v is None or k == "id":
            continue
        profile_lines.append(f"{k}: {v}")
    profile_block = "\n".join(profile_lines)
    prompt = (
        f"You are {persona_name}. The following is your profile:\n{profile_block}\n\n"
        f"Follow-up instruction:\n{follow_up}"
    )
    reply = call_llm(
        "persona_chat",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        run_id=run_id,
        persona_id=str(persona_name),
        max_tokens=120,
    )
    return reply 