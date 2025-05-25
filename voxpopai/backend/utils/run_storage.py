import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

RUN_DIR = Path(__file__).resolve().parents[2] / "data" / "runs"
RUN_DIR.mkdir(parents=True, exist_ok=True)

def save_run(payload: Dict[str, Any]) -> str:
    """Save run payload to disk and return run_id."""
    run_id = datetime.utcnow().strftime("%Y%m%dT%H%M%S%fZ")
    fp = RUN_DIR / f"{run_id}.json"
    with fp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return run_id

def list_runs() -> List[Dict[str, Any]]:
    """Return list of run metadata (id, timestamp, question, persona_count)."""
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
    fp = RUN_DIR / f"{run_id}.json"
    if not fp.exists():
        raise FileNotFoundError(run_id)
    return json.loads(fp.read_text()) 