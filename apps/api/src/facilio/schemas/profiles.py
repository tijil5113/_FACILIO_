"""Profiling and data-quality API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

ProfileStatus = Literal["NOT_PROFILED", "PROFILING", "READY", "FAILED"]
QualityStatus = Literal["ASSESSED", "NOT_ASSESSED"]
IssueSeverity = Literal["INFO", "WARNING", "CRITICAL"]


class QualityDimensionData(BaseModel):
    key: str
    label: str
    score: float | None
    status: QualityStatus
    explanation: str
    evidence_summary: str


class QualitySummaryData(BaseModel):
    dataset_id: UUID
    version_id: UUID | None = None
    status: ProfileStatus
    profile_version: str | None = None
    profiled_at: datetime | None = None
    stale: bool = False
    overall_score: float | None = None
    overall_status: QualityStatus | None = None
    grade: str | None = None
    assessed_count: int = 0
    not_assessed_count: int = 0
    weighting: str | None = None
    dimensions: list[QualityDimensionData] = Field(default_factory=list)


class IssueCountsData(BaseModel):
    total: int = 0
    critical: int = 0
    warning: int = 0
    info: int = 0


class DatasetProfileData(BaseModel):
    dataset_id: UUID
    version_id: UUID | None = None
    status: ProfileStatus
    profile_version: str | None = None
    profiled_at: datetime | None = None
    stale: bool = False
    error_code: str | None = None
    error_message: str | None = None
    summary: dict[str, Any] | None = None
    columns: list[dict[str, Any]] = Field(default_factory=list)
    quality: QualitySummaryData | None = None
    issue_counts: IssueCountsData = Field(default_factory=IssueCountsData)


class QualityIssueData(BaseModel):
    id: str
    code: str
    category: str
    severity: IssueSeverity
    title: str
    description: str
    column: str | None = None
    affected_count: int
    affected_percentage: float | None = None
    evidence: list[Any] = Field(default_factory=list)
    suggested_action: str
    suggested_operations: list[dict[str, Any]] = Field(default_factory=list)


class QualityIssueListData(BaseModel):
    items: list[QualityIssueData]
    page: int
    page_size: int
    total: int


class QualityOverviewItem(BaseModel):
    id: UUID
    name: str
    overall_score: float | None
    overall_status: QualityStatus | None
    grade: str | None
    profiled_at: datetime | None
    issue_count: int
    profile_status: ProfileStatus


class QualityOverviewData(BaseModel):
    datasets_total: int
    datasets_profiled: int
    datasets_failed: int
    datasets_not_profiled: int
    average_quality: float | None
    datasets_needing_attention: int
    recently_profiled: list[QualityOverviewItem]
