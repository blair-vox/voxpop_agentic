"""Sentiment Analyzer agent stub."""

from typing import List, Dict, Any


def analyze(responses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Return sentiment scores for each response (noop)."""
    # TODO: integrate with LLM or sentiment model
    for r in responses:
        r["sentiment"] = 0.0
    return responses 