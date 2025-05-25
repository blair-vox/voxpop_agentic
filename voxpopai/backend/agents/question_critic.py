"""Rewrite survey question; classify domain; propose impact dimensions."""
from __future__ import annotations
import os, json
from functools import lru_cache
from typing import Dict, Any
from openai import OpenAI

SYSTEM_PROMPT = """
You are a Question-Critic.

TASK A — Clarity
• Detect ambiguity, jargon, double-barrel, or bias.  
• If issues exist, propose a clearer single-sentence rewrite.

TASK B — Domain & Dimensions  
• Classify domain into: civic-policy, product-design, employee-engagement, marketing-copy (else: unknown).  
• Suggest up to three impact dimensions:  
    civic-policy:      Housing, Transport, Community, Environment, Economy  
    product-design:    Usability, Accessibility, Trust, Cost  
    employee-engagement: Workload, Growth, Culture  
    marketing-copy:    Clarity, Emotional Appeal, Brand Fit  

Return EXACT JSON:
{
  "ok": bool,                 # true if original is clear
  "rewritten": "<sentence>",  # original if ok
  "domain": "<label|unknown>",
  "impact_dims": ["dim1","dim2"]
}
"""

@lru_cache(1)
def _client() -> OpenAI:  # type: ignore
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def critic(question: str) -> Dict[str, Any]:
    """Return critique of the question as a dict defined in SYSTEM_PROMPT."""
    try:
        res = _client().chat.completions.create(
            model="gpt-3.5-turbo",
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
        )
        return json.loads(res.choices[0].message.content)  # type: ignore[arg-type]
    except Exception:
        # Fallback if API call fails
        return {
            "ok": True,
            "rewritten": question,
            "domain": "unknown",
            "impact_dims": [],
        } 