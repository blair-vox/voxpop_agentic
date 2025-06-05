"""Router exposing the Question-Critic."""
from fastapi import APIRouter, HTTPException, Depends
from voxpopai.backend.agents.question_critic import critic
from voxpopai.backend.utils.auth import get_current_user

router = APIRouter(prefix="/question", tags=["Question Critic"])


@router.post("/critic")
def run(payload: dict, user: dict = Depends(get_current_user)):
    q = payload.get("question", "")
    if not q:
        raise HTTPException(status_code=400, detail="question required")
    ctx = payload.get("context", "")
    full_q = f"{q}\n\nCONTEXT:\n{ctx}" if ctx else q
    return critic(full_q) 