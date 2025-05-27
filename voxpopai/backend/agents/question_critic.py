"""Rewrite survey question; classify domain; propose impact dimensions."""
from __future__ import annotations
import os, json
from functools import lru_cache
from typing import Dict, Any
from openai import OpenAI
from voxpopai.backend.utils.run_logger import write_log

SYSTEM_PROMPT = """
You are a Question-Critic EXPERT in writing focus-group questions and survey grids.

TASK A — Clarity
• Detect ambiguity, jargon, double-barrel, or bias.  
• If issues exist, propose a clearer single-sentence rewrite.

TASK B — Domain & Dimensions
• Classify domain into: civic-policy, product-design, employee-engagement,
  marketing-copy, technology-adoption, ai-adoption  (else: unknown).

• Suggest up to three impact dimensions:
    civic-policy:        Housing, Transport, Community, Environment, Economy
    product-design:      Usability, Accessibility, Trust, Cost
    employee-engagement: Workload, Growth, Culture
    marketing-copy:      Clarity, Emotional Appeal, Brand Fit
    technology-adoption: Ease of Use, Privacy & Security, Reliability, Learning Curve
    ai-adoption:         Innovation Readiness, Ethical Concerns, Job Impact, Pace of Change

TASK C — Survey Grid
• Suggest a main support question for the grid (e.g. "Support for the proposal", or "Support for using the term 'synthetic users'").
• Suggest up to three additional grid lines (e.g. "Clarity of the term", "Relevance to the group", "Personal comfort with the term").
• These should be tailored to the question and context.

Always consider any CONTEXT provided by the user after the question.

Return EXACT JSON:
{
  "ok": bool,                 # true if original is clear
  "rewritten": "<sentence>",  # original if ok
  "domain": "<label|unknown>",
  "impact_dims": ["dim1","dim2"],
  "reason": "<why this wording meets the stated needs>",
  "survey_grid_labels": {
    "support_label": "<main support question>",
    "impact_labels": ["label1", "label2", ...]
  }
}
"""

@lru_cache(1)
def _client() -> OpenAI:  # type: ignore
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def critic(question: str) -> Dict[str, Any]:
    """Return a structured critique for *question*.

    The OpenAI response is expected to follow the JSON schema described in
    *SYSTEM_PROMPT*.  If the API call fails we fall back to a minimal stub so
    that the pipeline can continue offline.
    """
    try:
        res = _client().chat.completions.create(
            model="gpt-3.5-turbo",
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
        )
        reply = res.choices[0].message.content
        write_log("question_critic", {"run_id": "global"}, question, reply)
        return json.loads(reply)  # type: ignore[arg-type]
    except Exception:
        # Fallback if API call fails
        return {
            "ok": True,
            "rewritten": question,
            "domain": "unknown",
            "impact_dims": [],
            "reason": "N/A",
            "survey_grid_labels": {"support_label": "Support for the proposal", "impact_labels": ["Housing", "Transport", "Community"]},
        } 