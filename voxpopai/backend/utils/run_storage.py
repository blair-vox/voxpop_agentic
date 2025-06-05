"""Disk-based storage helper for simulation runs.

Each run produces potentially large JSON output (>MB) so we append them to the
`data/runs/` directory as individual files.  This avoids introducing a database
at this stage while keeping retrieval trivial.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

RUN_DIR = Path(__file__).resolve().parents[2] / "data" / "runs"
RUN_DIR.mkdir(parents=True, exist_ok=True)

def save_run(payload: Dict[str, Any], user_sub: str | None = None) -> str:
    """Persist *payload* under `data/runs/<run_id>.json` and return the id.

    If *user_sub* is supplied, it is stored alongside the payload so that runs
    can later be filtered per user.
    """
    if user_sub:
        payload["user_sub"] = user_sub
    run_id = payload.get("run_id") or datetime.utcnow().strftime("%Y%m%dT%H%M%S%fZ")
    fp = RUN_DIR / f"{run_id}.json"
    with fp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return run_id

def list_runs(user_sub: str | None = None) -> List[Dict[str, Any]]:
    """Return lightweight metadata for stored runs.

    If *user_sub* is provided, only runs owned by that user are returned.
    """
    runs = []
    for p in sorted(RUN_DIR.glob("*.json")):
        try:
            data = json.loads(p.read_text())
            if user_sub and data.get("user_sub") != user_sub:
                continue
            runs.append(
                {
                    "id": p.stem,
                    "timestamp": data.get("timestamp"),
                    "question": data.get("question"),
                    "persona_count": len(data.get("responses", [])),
                }
            )
        except Exception:
            continue
    runs.sort(key=lambda x: x["id"], reverse=True)
    return runs

def load_run(run_id: str, user_sub: str | None = None) -> Dict[str, Any]:
    """Return the full JSON artefact for *run_id*.

    If *user_sub* is provided, ensure the run belongs to that user else raise 404.
    """
    fp = RUN_DIR / f"{run_id}.json"
    if not fp.exists():
        raise FileNotFoundError(run_id)
    data = json.loads(fp.read_text())
    if user_sub and data.get("user_sub") != user_sub:
        raise FileNotFoundError(run_id)
    return data 