"""Persona Builder agent stub."""

from typing import Any, List


def build_personas(filters: dict[str, Any], n: int = 100) -> List[dict[str, Any]]:
    """Return a list of synthetic personas.

    This is currently a placeholder that returns empty personas.
    """
    return [{"id": i, "name": f"Persona #{i}"} for i in range(n)] 