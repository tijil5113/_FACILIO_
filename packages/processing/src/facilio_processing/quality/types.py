"""Quality result types and issue inventory."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

QualityStatus = Literal["ASSESSED", "NOT_ASSESSED"]
IssueSeverity = Literal["INFO", "WARNING", "CRITICAL"]
IssueCategory = Literal[
    "COMPLETENESS",
    "UNIQUENESS",
    "VALIDITY",
    "CONSISTENCY",
    "STRUCTURE",
]
QualityGrade = Literal["Excellent", "Good", "Fair", "Needs attention", "Poor"]

DIMENSION_KEYS = (
    "COMPLETENESS",
    "UNIQUENESS",
    "VALIDITY",
    "CONSISTENCY",
    "INTEGRITY",
)


@dataclass(frozen=True, slots=True)
class QualityIssue:
    id: str
    code: str
    category: IssueCategory
    severity: IssueSeverity
    title: str
    description: str
    column: str | None
    affected_count: int
    affected_percentage: float | None
    evidence: list[str]
    suggested_action: str


@dataclass(frozen=True, slots=True)
class QualityDimension:
    key: str
    label: str
    score: float | None
    status: QualityStatus
    explanation: str
    evidence_summary: str


@dataclass(frozen=True, slots=True)
class QualityResult:
    overall_score: float | None
    overall_status: QualityStatus
    grade: QualityGrade | None
    assessed_count: int
    not_assessed_count: int
    weighting: str
    dimensions: list[QualityDimension]
    issues: list[QualityIssue] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
