import pandas as pd
import re
from collections import Counter
from typing import Dict, List, Any
from scipy.stats import chi2_contingency  # requires scipy

_demo_vars = {
    "age": "ABS_AGE_CATEGORY",
    "gender": "ABS_SEX",
    "marital": "H8",
    "tenure": "J1",
    "political": "B9_1",
    "education": "G3",
}


def demo_stats(sample_df: pd.DataFrame, pop_df: pd.DataFrame) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, col in _demo_vars.items():
        samp_counts = sample_df[col].value_counts().to_dict()
        pop_counts = pop_df[col].value_counts().to_dict()

        # Map political codes to names
        if key == "political":
            from voxpopai.backend.utils import mappings as mp

            def _name(val):
                try:
                    code = int(float(val))
                except Exception:
                    return str(val)
                return mp.political_leaning.get(code, "Other")

            samp_counts = {_name(k): v for k, v in samp_counts.items()}
            pop_counts = {_name(k): v for k, v in pop_counts.items()}

        # Map education codes to names
        if key == "education":
            samp_counts = {mp.edu_level.get(int(float(k)), "Other"): v for k, v in samp_counts.items()}
            pop_counts = {mp.edu_level.get(int(float(k)), "Other"): v for k, v in pop_counts.items()}

        # align
        all_keys = set(samp_counts) | set(pop_counts)
        samp = [samp_counts.get(k, 0) for k in all_keys]
        pop = [pop_counts.get(k, 0) for k in all_keys]
        chi2, *_ = chi2_contingency([samp, pop])
        out[key] = {
            "persona": samp_counts,
            "population": pop_counts,
            "chi2": chi2,
        }
    return out

_grid_re = re.compile(r"(Support Level|Impact – Housing|Impact – Transport|Impact – Community).*?:\s*(\d)")


def parse_survey_numbers(resp: str) -> Dict[str, int]:
    """Parse survey numbers from either JSON response_json or formatted text response."""
    numbers: Dict[str, int] = {}
    
    # Try to parse as JSON first (new format)
    try:
        import json
        data = json.loads(resp)
        if isinstance(data, dict) and "survey" in data:
            survey = data["survey"]
            # Map JSON keys to expected format
            if "support_level" in survey:
                numbers["support"] = int(survey["support_level"])
            if "housing" in survey:
                numbers["housing"] = int(survey["housing"])
            if "transport" in survey:
                numbers["transport"] = int(survey["transport"])
            if "community" in survey:
                numbers["community"] = int(survey["community"])
            return numbers
    except (json.JSONDecodeError, KeyError, ValueError, TypeError):
        pass
    
    # Fall back to regex parsing for old text format
    for label, num in _grid_re.findall(resp):
        lbl = label.split("–")[-1].strip().lower().replace(" ", "_") if "Impact" in label else "support"
        numbers[lbl] = int(num)
    return numbers


def location_freq(personas: List[Dict[str, Any]]) -> Dict[str, int]:
    c = Counter(p.get("location", "Unknown") for p in personas)
    return dict(c) 