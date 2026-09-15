"""Version and transformation API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from facilio.schemas.datasets import DatasetSummary

VersionKind = Literal["ORIGINAL", "DERIVED"]
ProfileStatus = Literal["NOT_PROFILED", "PROFILING", "READY", "FAILED"]


class DatasetVersionSummary(BaseModel):
    id: UUID
    dataset_id: UUID
    version_number: int
    parent_version_id: UUID | None = None
    kind: VersionKind
    label: str
    row_count: int | None = None
    column_count: int | None = None
    profile_status: ProfileStatus
    profiled_at: datetime | None = None
    created_at: datetime
    is_current: bool = False
    operation_code: str | None = None
    operation_summary: str | None = None
    created_by_workflow_run_id: UUID | None = None
    workflow_name: str | None = None
    workflow_revision: int | None = None


class DatasetVersionDetail(DatasetVersionSummary):
    columns: list[dict[str, Any]] = Field(default_factory=list)


class TransformationRequest(BaseModel):
    operation: str = Field(min_length=1, max_length=64)
    parameters: dict[str, Any] = Field(default_factory=dict)


class SetCurrentVersionRequest(BaseModel):
    version_id: UUID


class TransformationImpactData(BaseModel):
    rows_before: int
    rows_after: int
    columns_before: int
    columns_after: int
    changed_cell_count: int
    removed_row_count: int
    removed_column_count: int
    affected_row_count: int
    no_op: bool


class ChangeExampleData(BaseModel):
    kind: Literal["cell", "row_removed", "column_removed"]
    row_index: int | None = None
    column: str | None = None
    before: Any = None
    after: Any = None
    reason: str | None = None


class TransformationPreviewData(BaseModel):
    operation: str
    parameters: dict[str, Any]
    input_version_id: UUID
    impact: TransformationImpactData
    examples: list[ChangeExampleData] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    summary: str
    extra: dict[str, Any] = Field(default_factory=dict)


class QualityDeltaDimension(BaseModel):
    key: str
    label: str
    before: float | None = None
    after: float | None = None
    delta: float | None = None


class QualityDeltaData(BaseModel):
    before: float | None = None
    after: float | None = None
    delta: float | None = None
    dimensions: list[QualityDeltaDimension] = Field(default_factory=list)


class TransformationApplyData(BaseModel):
    version: DatasetVersionDetail
    transformation_id: UUID
    summary: str
    impact: TransformationImpactData
    profile_status: ProfileStatus
    quality_delta: QualityDeltaData | None = None


class TransformationRecordData(BaseModel):
    id: UUID
    dataset_id: UUID
    input_version_id: UUID
    output_version_id: UUID
    operation_code: str
    parameters: dict[str, Any]
    summary: str
    impact: TransformationImpactData
    created_at: datetime


class LineageNodeData(BaseModel):
    version: DatasetVersionSummary
    transformation: TransformationRecordData | None = None


class LineageData(BaseModel):
    items: list[LineageNodeData]


class VersionComparisonData(BaseModel):
    parent: DatasetVersionSummary
    child: DatasetVersionSummary
    impact: TransformationImpactData | None = None
    transformation: TransformationRecordData | None = None
    quality_delta: QualityDeltaData | None = None


class WorkspaceStatsData(BaseModel):
    datasets: int
    derived_versions: int
    transformations_applied: int
    datasets_analyzed: int
    workflow_count: int = 0
    workflow_run_count: int = 0
    successful_run_count: int = 0
    failed_run_count: int = 0
    queued_job_count: int = 0
    running_job_count: int = 0
    failed_job_count: int = 0
    user_dataset_count: int = 0
    sample_dataset_count: int = 0
    recent_datasets: list[DatasetSummary] = Field(default_factory=list)
