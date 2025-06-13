import os
from typing import List, Optional, Dict, Callable
from functools import lru_cache
from openai import OpenAI
import requests
from voxpopai.backend.utils.run_logger import write_log


@lru_cache(1)
def _client() -> OpenAI:  # type: ignore
    """Singleton OpenAI client so we do not re-create connection pools."""
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def call_llm(step: str, messages: List[Dict[str, str]], *, run_id: Optional[str] = None, persona_id: Optional[str] = None, model: str = "gpt-3.5-turbo", provider: Optional[str] = None, temperature: float = 0.7, max_tokens: Optional[int] = None) -> str:
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
        Model name passed down to the provider.
    provider
        Optional explicit provider override ("openai", "ollama", etc.).  If
        omitted we infer the provider from *model*.
    """
    # Capture both system and user messages for complete context
    system_parts = [m.get("content", "") for m in messages if m.get("role") == "system"]
    user_parts = [m.get("content", "") for m in messages if m.get("role") == "user"]
    
    prompt_serial = ""
    if system_parts:
        prompt_serial += "SYSTEM: " + " | ".join(system_parts) + "\n\n"
    if user_parts:
        prompt_serial += "USER: " + " | ".join(user_parts)

    prov = provider or _infer_provider(model)
    if prov not in _PROVIDER_FUNCS:
        raise ValueError(f"Unknown LLM provider '{prov}'. Available: {list(_PROVIDER_FUNCS)}")

    reply = _PROVIDER_FUNCS[prov](messages, model, temperature, max_tokens)

    write_log(step, {"run_id": run_id, "persona_id": persona_id, "model": model, "provider": prov}, prompt_serial, reply)
    return reply 


# ----------------- Provider helper functions -----------------

def _openai_chat(messages: List[Dict[str, str]], model: str, temperature: float, max_tokens: Optional[int]) -> str:
    """Call the OpenAI chat completions endpoint and return the assistant reply."""
    res = _client().chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        **({"max_tokens": max_tokens} if max_tokens is not None else {}),
    )
    return res.choices[0].message.content.strip()


def _ollama_chat(messages: List[Dict[str, str]], model: str, temperature: float, max_tokens: Optional[int]) -> str:  # pragma: no cover
    """Call a local Ollama server to interact with open-weight models (e.g. llama3).

    The function expects an Ollama server running at ``$OLLAMA_HOST`` (defaults to
    ``http://localhost:11434``).  It uses the `/api/chat` endpoint with
    ``stream: false`` for a blocking HTTP request.
    """
    host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    url = host.rstrip("/") + "/api/chat"
    payload: Dict[str, object] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
    }
    if max_tokens is not None:
        # In Ollama the equivalent is `num_predict`
        payload["num_predict"] = max_tokens
    try:
        resp = requests.post(url, json=payload, timeout=600)
        resp.raise_for_status()
        data = resp.json()
        # Response schema: { "message": { "content": "..." }, ... }
        return data["message"]["content"].strip()
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"Ollama chat call failed: {exc}") from exc


# Map provider IDs to concrete callables so we can easily extend in the future.
_PROVIDER_FUNCS: Dict[str, Callable[[List[Dict[str, str]], str, float, Optional[int]], str]] = {
    "openai": _openai_chat,
    "ollama": _ollama_chat,
}


# ----------------- Provider selection logic -----------------

def _infer_provider(model: str) -> str:
    """Heuristic mapping from *model* name to provider ID.

    • Names starting with ``gpt-`` default to the *openai* provider.
    • Otherwise we fall back to *ollama* (assumes the model is available locally).
    """
    if model.startswith("gpt-") or model.startswith("text-"):
        return "openai"
    # Simple heuristic – can be expanded later (e.g. ``mixtral-*`` → openrouter).
    return "ollama" 