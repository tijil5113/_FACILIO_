"""Guided Cleanup API schemas."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from facilio.schemas.jobs import JobSummary
from facilio.schemas.transformations import (
    ChangeExampleData,
    QualityDeltaData,
    TransformationImpactData,
)
from facilio.schemas.workflows import (
    WorkflowPreviewStepData,
    WorkflowRunDetail,
    WorkflowValidationData,
)

ImpactLevel = Literal["LOW", "MODERATE", "HIGH"]
RecommendationKind = Literal["actionable", "informational"]


class CleanupConfigurationOption(BaseModel):
    field: str
    label: str
    value: Any = None
    operation_code: str | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)


class GuidedRecommendationData(BaseModel):
    recommendation_id: str
    issue_id: str
    issue_code: str
    kind: RecommendationKind
    title: str
    explanation: str
    suggested_cleanup: str
    columns: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    affected_count: int | None = None
    operation_code: str | None = None
    default_parameters: dict[str, Any] = Field(default_factory=dict)
    options: list[CleanupConfigurationOption] = Field(default_factory=list)
    required_user_configuration: bool = False
    impact_level: ImpactLevel | None = None
    previewable: bool = False
    applicable: bool = False
    not_applicable_reason: str | None = None
    preselected: bool = False
    execution_rank: int
    why: str


class CleanupRecommendationsData(BaseModel):
    dataset_id: UUID
    version_id: UUID
    version_number: int
    engine_version: str
    actionable_count: int
    informational_count: int
    recommendations: list[GuidedRecommendationData]
    selection_policy: str


class CleanupStepRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recommendation_id: str | None = None
    operation_code: str = Field(min_length=1, max_length=64)
    parameters: dict[str, Any] = Field(default_factory=dict)


class CleanupPreviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    steps: list[CleanupStepRequest] = Field(min_length=1, max_length=50)


class CleanupApplyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    steps: list[CleanupStepRequest] = Field(min_length=1, max_length=50)
    plan_fingerprint: str = Field(min_length=16, max_length=128)
    acknowledge_high_impact: bool = False


class CleanupPreviewExample(ChangeExampleData):
    step_position: int
    operation_code: str
    recommendation_id: str | None = None


class CleanupPreviewData(BaseModel):
    dataset_id: UUID
    input_version_id: UUID
    input_version_number: int
    plan_fingerprint: str
    no_op: bool
    high_impact: bool
    rows_before: int
    rows_after: int
    columns_before: int
    columns_after: int
    changed_cell_count: int
    removed_row_count: int
    removed_column_count: int
    warnings: list[str] = Field(default_factory=list)
    steps: list[WorkflowPreviewStepData]
    examples: list[CleanupPreviewExample] = Field(default_factory=list)
    projected_quality: QualityDeltaData | None = None
    validation: WorkflowValidationData
    duration_ms: int
    expected_output: str = "One new cleaned version"


class CleanupApplyData(BaseModel):
    dataset_id: UUID
    input_version_id: UUID
    input_version_number: int
    output_version_id: UUID | None = None
    output_version_number: int | None = None
    plan_fingerprint: str
    impact: TransformationImpactData | None = None
    quality_delta: QualityDeltaData | None = None
    profile_status: str | None = None
    job: JobSummary
    workflow_run: WorkflowRunDetail
    original_unchanged: bool = True
