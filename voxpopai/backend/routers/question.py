"""Router exposing the Question-Critic."""
from fastapi import APIRouter, HTTPException
from voxpopai.backend.agents.question_critic import critic

router = APIRouter(prefix="/question", tags=["Question Critic"])


@router.post("/critic")
def run(payload: dict):
    q = payload.get("question", "")
    if not q:
        raise HTTPException(status_code=400, detail="question required")
    return critic(q) 