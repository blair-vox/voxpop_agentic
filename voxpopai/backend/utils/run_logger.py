"""Simple JSONL run logger for critic steps."""
import os, json, pathlib, datetime, uuid

LOG_DIR = pathlib.Path(os.getenv("RUN_LOG_DIR", ".logs"))
LOG_DIR.mkdir(exist_ok=True)

# -----------------------------------------------------------------------------
# Utility: *run_logger*
# -----------------------------------------------------------------------------
# The critic pipeline emits intermediate diagnostics (e.g. relevance problems,
# consistency fixes).  To debug or audit a simulation run we want these steps
# persisted to disk without coupling the core logic to any external DB.  Each
# call to ``write_log`` appends a single JSON object to a ``.jsonl`` file whose
# name encodes the *run_id* and the processing *step*.
#
# Storing as newline-delimited JSON keeps the write-path trivial and allows easy
# streaming / grep usage later.

def write_log(step: str, payload: dict, prompt: str | None = None, response: str | None = None):
    """Append a JSON record for *step* to ``.logs/<run_id>_<step>.jsonl``.

    Additional *prompt* and *response* fields can be supplied so that a full
    call-and-response timeline can be reconstructed later.  Existing callers
    that pass only *(step, payload)* continue to work.
    """
    run_id = payload.get("run_id") or uuid.uuid4().hex
    f = LOG_DIR / f"{run_id}_{step}.jsonl"
    record = {
        "ts": datetime.datetime.utcnow().isoformat(),
        **payload,
    }
    if prompt is not None:
        record["prompt"] = prompt
    if response is not None:
        record["response"] = response
    with f.open("a") as fp:
        fp.write(json.dumps(record) + "\n") 