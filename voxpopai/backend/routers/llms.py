from fastapi import APIRouter
import os, requests

router = APIRouter(prefix="/llms", tags=["LLMs"])

# Default known models list – should match front-end constant
KNOWN_MODELS = [
    "gpt-3.5-turbo",
    "gpt-4",
    "gpt-4o-preview",
    "llama3",
    "mistral:instruct",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
]


def _infer_provider(model: str) -> str:
    if model.startswith("gpt-") or model.startswith("text-"):
        return "openai"
    if model.startswith("claude") or model.startswith("anthropic-"):
        return "anthropic"
    return "ollama"


def _ollama_has(model: str) -> bool:
    host = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
    try:
        resp = requests.get(f"{host}/api/tags", timeout=2)
        resp.raise_for_status()
        data = resp.json()
        names = {item.get("name") for item in data.get("models", [])}
        return model in names
    except Exception:
        return False


@router.get("/available")
async def list_available() -> dict[str, bool]:
    available: dict[str, bool] = {}
    openai_key = bool(os.getenv("OPENAI_API_KEY"))
    anthropic_key = bool(os.getenv("ANTHROPIC_API_KEY"))
    for mdl in KNOWN_MODELS:
        prov = _infer_provider(mdl)
        if prov == "openai":
            available[mdl] = openai_key
        elif prov == "anthropic":
            available[mdl] = anthropic_key
        else:  # ollama
            available[mdl] = _ollama_has(mdl)
    return available 