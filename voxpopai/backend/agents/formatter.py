"""Formatter agent stub."""

from typing import Dict, Any, Optional
from pathlib import Path


def generate_report(payload: Dict[str, Any], output_dir: Optional[Path] = None) -> Path:
    """Generate PDF/CSV report (noop)."""
    # TODO: Implement with WeasyPrint and CSV writer
    if output_dir is None:
        output_dir = Path.cwd() / "reports"
    output_dir.mkdir(parents=True, exist_ok=True)
    fake_path = output_dir / "report.pdf"
    fake_path.touch()
    return fake_path 