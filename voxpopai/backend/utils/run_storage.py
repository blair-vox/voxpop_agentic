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

def save_run(payload: Dict[str, Any]) -> str:
    """Persist *payload* under `data/runs/<run_id>.json` and return the id.

    The *run_id* is taken from the payload if present, otherwise a UTC timestamp
    is generated.  The timestamp format is sortable so recent runs appear last
    when listing the directory.
    """
    run_id = payload.get("run_id") or datetime.utcnow().strftime("%Y%m%dT%H%M%S%fZ")
    fp = RUN_DIR / f"{run_id}.json"
    with fp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return run_id

def list_runs() -> List[Dict[str, Any]]:
    """Return lightweight metadata for all stored runs.

    Only the fields needed for an overview page are loaded to keep startup
    latency low.  The list is sorted newest-first.
    """
    runs = []
    for p in sorted(RUN_DIR.glob("*.json")):
        try:
            data = json.loads(p.read_text())
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

def load_run(run_id: str) -> Dict[str, Any]:
    """Return the full JSON artefact for *run_id* or raise *FileNotFoundError*."""
    fp = RUN_DIR / f"{run_id}.json"
    if not fp.exists():
        raise FileNotFoundError(run_id)
    return json.loads(fp.read_text()) 