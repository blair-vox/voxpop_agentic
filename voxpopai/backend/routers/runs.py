from fastapi import APIRouter

router = APIRouter(prefix="/runs", tags=["Runs"])


@router.post("/")
async def start_run(payload: dict) -> dict:
    """Start a new synthetic focus-group run (stub)."""
    # TODO: orchestrate Step Functions + agents
    return {"run_id": "dummy"} 