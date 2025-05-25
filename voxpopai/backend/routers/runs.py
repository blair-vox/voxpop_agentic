from fastapi import APIRouter, HTTPException
from voxpopai.backend.utils.run_storage import list_runs, load_run

router = APIRouter(prefix="/runs", tags=["Runs"])


@router.post("/")
async def start_run(payload: dict) -> dict:
    """Start a new synthetic focus-group run (stub)."""
    # TODO: orchestrate Step Functions + agents
    return {"run_id": "dummy"}


@router.get("/")
async def get_runs():
    """Return list of saved runs (metadata)."""
    return list_runs()


@router.get("/{run_id}")
async def get_run(run_id: str):
    """Return full JSON payload for a given run."""
    try:
        return load_run(run_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found") 