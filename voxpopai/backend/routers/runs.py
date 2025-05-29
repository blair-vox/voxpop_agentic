from fastapi import APIRouter, HTTPException, Depends
from voxpopai.backend.utils.run_storage import list_runs, load_run
from voxpopai.backend.utils.auth import get_current_user

router = APIRouter(prefix="/runs", tags=["Runs"])


@router.post("/")
async def start_run(payload: dict) -> dict:
    """Start a new synthetic focus-group run (stub)."""
    # TODO: orchestrate Step Functions + agents
    return {"run_id": "dummy"}


@router.get("/")
async def get_runs(user: dict = Depends(get_current_user)):
    """Return list of saved runs (metadata)."""
    return list_runs(user.get("sub"))


@router.get("/{run_id}")
async def get_run(run_id: str, user: dict = Depends(get_current_user)):
    """Return full JSON payload for a given run."""
    try:
        return load_run(run_id, user.get("sub"))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found") 