"""Check narrative vs persona bio AND survey grid for coherence."""
from __future__ import annotations
import os, json
from functools import lru_cache
from typing import Dict, Any
from openai import OpenAI
from voxpopai.backend.utils.run_logger import write_log

SYSTEM_PROMPT = """
Given PROFILE (JSON) and ANSWER (narrative + SURVEY grid):

1. Flag contradictions with profile facts (age, location, tenure, etc.).  
2. Ensure narrative stance matches Support Level:  
     • Supportive narrative ⇒ Support Level 4–5  
     • Opposing narrative  ⇒ Support Level 1–2  
3. If narrative complains about transport, Impact-Transport must be 1–2…  
Return JSON:
{
  "status": "OK" | "FIX_NEEDED",
  "issues": ["..."],
  "corrected_answer": "<answer if you fixed it>"
}
"""

@lru_cache(1)
def _client() -> OpenAI:  # type: ignore
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def critique(profile_json: str, answer: str, run_id: str) -> Dict[str, Any]:
    prompt = f"PROFILE\n{profile_json}\n\nANSWER\n{answer}"
    try:
        res = _client().chat.completions.create(
            model="gpt-3.5-turbo",
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        out = json.loads(res.choices[0].message.content)
    except Exception as e:
        out = {"status": "ERROR", "issues": [str(e)], "corrected_answer": answer}

    write_log("consistency_critic", {"run_id": run_id, **out})
    return out 