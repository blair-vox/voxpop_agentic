from fastapi import APIRouter, HTTPException
from voxpopai.backend.utils.run_logger import LOG_DIR
import json, glob

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("/{run_id}/{persona_id}")
async def get_logs(run_id: str, persona_id: str):
    """Return ordered list of log events for *persona_id* within *run_id*."""
    pattern = str(LOG_DIR / f"{run_id}_*.jsonl")
    files = glob.glob(pattern)
    if not files:
        raise HTTPException(status_code=404, detail="run_id not found")
    events = []
    for f in files:
        with open(f, "r", encoding="utf-8") as fp:
            for line in fp:
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                if str(rec.get("persona_id")) == str(persona_id):
                    events.append(rec)
    # Sort by timestamp ISO str
    events.sort(key=lambda r: r.get("ts", ""))
    return events 