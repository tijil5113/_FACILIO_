"""Workflow and workflow-run API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from facilio.schemas.transformations import (
    ChangeExampleData,
    QualityDeltaData,
    TransformationImpactData,
)

WorkflowStatus = Literal["DRAFT", "READY", "INVALID", "ARCHIVED"]
WorkflowRunStatus = Literal["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]
WorkflowStepRunStatus = Literal[
    "PENDING", "RUNNING", "SUCCEEDED", "FAILED", "SKIPPED", "CANCELLED"
]
CompatibilityStatus = Literal["COMPATIBLE", "INCOMPATIBLE"]


class WorkflowStepData(BaseModel):
    id: UUID
    workflow_id: UUID
    position: int
    operation_code: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    enabled: bool
    created_at: datetime
    updated_at: datetime


class WorkflowSummary(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    status: WorkflowStatus
    revision: int
    step_count: int
    enabled_step_count: int
    last_run_at: datetime | None = None
    last_run_status: WorkflowRunStatus | None = None
    created_at: datetime
    updated_at: datetime


class WorkflowDetail(WorkflowSummary):
    steps: list[WorkflowStepData] = Field(default_factory=list)


class WorkflowListData(BaseModel):
    items: list[WorkflowSummary]
    page: int
    page_size: int
    total: int


class WorkflowStepSeed(BaseModel):
    operation_code: str = Field(min_length=1, max_length=64)
    parameters: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True


class CreateWorkflowRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    steps: list[WorkflowStepSeed] = Field(default_factory=list, max_length=50)


class PatchWorkflowRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    expected_revision: int | None = None


class CreateStepRequest(BaseModel):
    operation_code: str = Field(min_length=1, max_length=64)
    parameters: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True
    expected_revision: int | None = None


class PatchStepRequest(BaseModel):
    parameters: dict[str, Any] | None = None
    enabled: bool | None = None
    operation_code: str | None = Field(default=None, min_length=1, max_length=64)
    expected_revision: int | None = None


class ReorderStepsRequest(BaseModel):
    step_ids: list[UUID]
    expected_revision: int | None = None


class WorkflowInputRequest(BaseModel):
    dataset_id: UUID
    version_id: UUID


class ValidationIssueData(BaseModel):
    code: str
    message: str
    severity: Literal["error", "warning"] = "error"
    step_id: UUID | None = None
    position: int | None = None
    field: str | None = None
    column: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class SchemaColumnData(BaseModel):
    name: str
    dtype: str


class ContractColumnData(BaseModel):
    name: str
    dtype: str
    numeric_compatible: bool = False


class CompatibilityData(BaseModel):
    status: CompatibilityStatus
    compatible: bool
    reasons: list[ValidationIssueData] = Field(default_factory=list)


class StepValidationData(BaseModel):
    step_id: UUID
    position: int
    operation_code: str
    enabled: bool
    valid: bool
    schema_before: list[SchemaColumnData] = Field(default_factory=list)
    schema_after: list[SchemaColumnData] = Field(default_factory=list)
    issues: list[ValidationIssueData] = Field(default_factory=list)


class WorkflowValidationData(BaseModel):
    valid: bool
    empty: bool
    issues: list[ValidationIssueData] = Field(default_factory=list)
    steps: list[StepValidationData] = Field(default_factory=list)
    contract: list[ContractColumnData] = Field(default_factory=list)
    compatibility: CompatibilityData | None = None
    projected_schema: list[SchemaColumnData] = Field(default_factory=list)


class WorkflowPreviewStepData(BaseModel):
    step_id: UUID
    position: int
    operation_code: str
    parameters: dict[str, Any]
    status: WorkflowStepRunStatus
    impact: TransformationImpactData | None = None
    examples: list[ChangeExampleData] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    summary: str
    duration_ms: int = 0
    error_code: str | None = None
    error_message: str | None = None


class WorkflowPreviewData(BaseModel):
    validation: WorkflowValidationData
    no_op: bool
    rows_before: int
    rows_after: int
    columns_before: int
    columns_after: int
    steps: list[WorkflowPreviewStepData]
    projected_quality: QualityDeltaData | None = None
    duration_ms: int


class WorkflowSnapshotData(BaseModel):
    workflow_id: UUID
    name: str
    revision: int
    steps: list[dict[str, Any]]


class WorkflowStepRunData(BaseModel):
    id: UUID
    workflow_run_id: UUID
    workflow_step_id: UUID | None
    position: int
    operation_code: str
    status: WorkflowStepRunStatus
    duration_ms: int | None = None
    rows_before: int | None = None
    rows_after: int | None = None
    columns_before: int | None = None
    columns_after: int | None = None
    changed_cells: int | None = None
    removed_rows: int | None = None
    removed_columns: int | None = None
    warning_summary: str | None = None
    error_code: str | None = None
    error_message_safe: str | None = None
    step_snapshot: dict[str, Any] = Field(default_factory=dict)


class WorkflowRunSummary(BaseModel):
    id: UUID
    workflow_id: UUID | None
    workflow_name: str
    workflow_revision: int
    input_dataset_id: UUID | None
    input_dataset_name: str | None = None
    input_version_id: UUID | None
    output_version_id: UUID | None
    input_version_number: int | None = None
    output_version_number: int | None = None
    status: WorkflowRunStatus
    step_count: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int | None = None
    error_code: str | None = None
    error_message_safe: str | None = None
    quality_before: float | None = None
    quality_after: float | None = None


class WorkflowRunDetail(WorkflowRunSummary):
    workflow_snapshot: dict[str, Any]
    step_runs: list[WorkflowStepRunData] = Field(default_factory=list)
    quality_delta: QualityDeltaData | None = None


class WorkflowRunListData(BaseModel):
    items: list[WorkflowRunSummary]
    page: int
    page_size: int
    total: int
