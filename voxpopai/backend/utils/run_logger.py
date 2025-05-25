"""Simple JSONL run logger for critic steps."""
import os, json, pathlib, datetime, uuid

LOG_DIR = pathlib.Path(os.getenv("RUN_LOG_DIR", ".logs"))
LOG_DIR.mkdir(exist_ok=True)


def write_log(step: str, payload: dict):
    run_id = payload.get("run_id") or uuid.uuid4().hex
    f = LOG_DIR / f"{run_id}_{step}.jsonl"
    with f.open("a") as fp:
        fp.write(json.dumps({"ts": datetime.datetime.utcnow().isoformat(), **payload}) + "\n") 