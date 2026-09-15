"""Overall score, grades, and documented weighting.

Overall quality is the unweighted arithmetic mean of ASSESSED dimensions.
NOT_ASSESSED dimensions are excluded (they are neither 0 nor 100).
If no dimension is assessed, overall status is NOT_ASSESSED.
"""

from __future__ import annotations

from facilio_processing.profiling.jsonutil import round_score
from facilio_processing.quality.types import QualityGrade, QualityStatus


def overall_from_scores(scores: list[float]) -> tuple[float | None, QualityStatus]:
    if not scores:
        return None, "NOT_ASSESSED"
    return round_score(sum(scores) / len(scores)), "ASSESSED"


def grade_for(score: float | None, status: QualityStatus) -> QualityGrade | None:
    """Bands: 90–100 Excellent, 80–89.9 Good, 70–79.9 Fair,
    60–69.9 Needs attention, below 60 Poor.
    """
    if status != "ASSESSED" or score is None:
        return None
    if score >= 90:
        return "Excellent"
    if score >= 80:
        return "Good"
    if score >= 70:
        return "Fair"
    if score >= 60:
        return "Needs attention"
    return "Poor"
