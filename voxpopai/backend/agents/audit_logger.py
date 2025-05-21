"""Audit Logger agent stub."""

from typing import Dict, Any
import logging

logger = logging.getLogger("voxpopai.audit")


def log_event(event: Dict[str, Any]) -> None:
    """Log agent event to DynamoDB/Redshift pipeline (noop)."""
    # TODO: send to telemetry store
    logger.info("AUDIT_EVENT", extra=event) 