"""Deterministic guided-cleanup recommendations. Not AI."""

from facilio_processing.cleanup.plan import (
    OPERATION_ORDER,
    detect_plan_conflicts,
    order_steps,
    plan_fingerprint,
)
from facilio_processing.cleanup.recommendations import (
    GUIDED_ENGINE_VERSION,
    build_recommendations,
)

__all__ = [
    "GUIDED_ENGINE_VERSION",
    "OPERATION_ORDER",
    "build_recommendations",
    "detect_plan_conflicts",
    "order_steps",
    "plan_fingerprint",
]
