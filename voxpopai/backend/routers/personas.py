from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/personas", tags=["Personas"])


@router.get("/")
async def list_personas() -> list[dict]:
    """Return the list of personas (stub)."""
    return []


@router.post("/")
async def create_persona(payload: dict) -> dict:
    """Create a new persona (stub)."""
    # TODO: call Persona-Builder agent
    return payload 