"""Quality engine. Independent of Flask."""

from __future__ import annotations

from facilio_processing.profiling.limits import ProfileLimits
from facilio_processing.profiling.types import DatasetProfile
from facilio_processing.quality.dimensions import (
    completeness,
    consistency,
    integrity,
    uniqueness,
    validity,
)
from facilio_processing.quality.issues import build_issues
from facilio_processing.quality.scoring import grade_for, overall_from_scores
from facilio_processing.quality.types import QualityResult

WEIGHTING = "Equal arithmetic mean of ASSESSED dimensions only."


def evaluate_quality(
    profile: DatasetProfile,
    values_by_column: dict[int, list] | None = None,
    *,
    limits: ProfileLimits | None = None,
) -> QualityResult:
    dimensions = [
        completeness(profile),
        uniqueness(profile),
        validity(profile),
        consistency(profile),
        integrity(profile),
    ]
    assessed = [item.score for item in dimensions if item.status == "ASSESSED" and item.score is not None]
    overall_score, overall_status = overall_from_scores(assessed)
    issues = build_issues(
        profile,
        values_by_column,
        limits=limits or ProfileLimits(),
    )
    return QualityResult(
        overall_score=overall_score,
        overall_status=overall_status,
        grade=grade_for(overall_score, overall_status),
        assessed_count=len(assessed),
        not_assessed_count=len(dimensions) - len(assessed),
        weighting=WEIGHTING,
        dimensions=dimensions,
        issues=issues,
    )
