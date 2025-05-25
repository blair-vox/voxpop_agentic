"""Return list of required dimensions missing from narrative."""
from typing import List
from voxpopai.backend.utils.run_logger import write_log

REQUIRED = {
    "civic-policy": ["housing", "transport", "community"],
    "product-design": ["usability", "trust", "cost"],
    "employee-engagement": ["workload", "growth", "culture"],
    "marketing-copy": ["clarity", "brand", "emotion"],
}


def find_gaps(text: str, domain: str, run_id: str) -> List[str]:
    req = REQUIRED.get(domain, [])
    missing = [w for w in req if w not in text.lower()]
    write_log("topic_critic", {"run_id": run_id, "missing": missing})
    return missing 