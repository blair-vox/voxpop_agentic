import os, json
from typing import List, Dict, Any, Optional
from functools import lru_cache
from openai import OpenAI
from voxpopai.backend.utils.run_logger import write_log


@lru_cache(1)
def _client() -> OpenAI:  # type: ignore
    """Singleton OpenAI client so we do not re-create connection pools."""
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def call_llm(step: str, messages: List[Dict[str, str]], *, run_id: Optional[str] = None, persona_id: Optional[str] = None, model: str = "gpt-3.5-turbo", temperature: float = 0.7, max_tokens: Optional[int] = None) -> str:
    """Wrapper for OpenAI chat completions that logs prompt & response.

    Parameters
    ----------
    step
        Short label used when writing the log, e.g. ``"persona_chat"``.
    messages
        Standard OpenAI *messages* array.
    run_id, persona_id
        Optional identifiers so the UI can filter logs per persona.
    model, temperature, max_tokens
        Passed directly to the OpenAI client.
    """
    # Serialise the *user* parts of the prompt for compact logging
    prompt_serial = " | ".join([m.get("content", "") for m in messages if m.get("role") == "user"])

    res = _client().chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        **({"max_tokens": max_tokens} if max_tokens is not None else {}),
    )
    reply = res.choices[0].message.content.strip()

    write_log(step, {"run_id": run_id, "persona_id": persona_id}, prompt_serial, reply)
    return reply 