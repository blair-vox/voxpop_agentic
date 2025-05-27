"""Ensure narrative actually addresses the proposal."""
from __future__ import annotations
import os, json, re
from functools import lru_cache
from typing import Dict, Any
from openai import OpenAI
from voxpopai.backend.utils.run_logger import write_log

SYSTEM_PROMPT = """
You are an Answer-Relevance-Critic.
Given QUESTION and ANSWER:
1. Verify the narrative clearly responds to the proposal.
2. If the answer does NOT reference the proposal or talks about unrelated topics, flag it.
3. Provide a short explanation.
4. If fixable, rewrite/append up to 3 sentences so the answer addresses the proposal.

Return JSON strictly:
{
  "status": "OK" | "FIX_NEEDED",
  "issues": ["..why"],
  "corrected_answer": "<answer if fixed else original>"
}
"""

@lru_cache(1)
def _client() -> OpenAI:  # type: ignore
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def critique(question: str, answer: str, run_id: str, grid_labels: dict = None) -> Dict[str, Any]:
    """Return relevance assessment and optional fix for *answer*.

    Parameters
    ----------
    question
        The original proposal the persona should address.
    answer
        The persona's narrative + survey block.
    run_id
        Identifier used by *run_logger* so that all critic artefacts can be
        correlated.
    grid_labels
        Custom labels for the Likert grid used to verify headings.
    """
    prompt = f"QUESTION:\n{question}\n\nANSWER:\n{answer}"
    try:
        # Regex check for required headings and grid labels
        required = [r"NARRATIVE:", r"SURVEY:"]
        if grid_labels:
            required.append(re.escape(grid_labels.get("support_label", "Support for the proposal")))
            for label in grid_labels.get("impact_labels", []):
                required.append(re.escape(label))
        missing = [lab for lab in required if not re.search(lab, answer, re.IGNORECASE)]
        if missing:
            out = {"status": "FIX_NEEDED", "issues": [f"Missing required section: {', '.join(missing)}"], "corrected_answer": answer}
        else:
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

    # Capture prompt and the (potentially corrected) response for timeline
    write_log("relevance_critic", {"run_id": run_id, **out}, prompt, json.dumps(out.get("corrected_answer")))
    return out 