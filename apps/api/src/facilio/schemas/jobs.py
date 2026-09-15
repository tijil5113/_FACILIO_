"""Job and operational health API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from facilio.schemas.workflows import WorkflowRunDetail, WorkflowStepRunData

JobType = Literal["WORKFLOW_RUN"]
JobStatus = Literal[
    "QUEUED",
    "RUNNING",
    "SUCCEEDED",
    "FAILED",
    "CANCEL_REQUESTED",
    "CANCELLED",
]
JobErrorCategory = Literal["VALIDATION", "DATA", "INFRASTRUCTURE", "WORKER", "INTERNAL"]


class JobAttemptData(BaseModel):
    id: UUID
    job_id: UUID
    attempt_number: int
    status: JobStatus
    worker_id: str | None = None
    started_at: datetime
    completed_at: datetime | None = None
    duration_ms: int | None = None
    error_code: str | None = None
    error_message_safe: str | None = None
    error_category: JobErrorCategory | None = None


class JobProgressData(BaseModel):
    current: int
    total: int
    label: str


class JobSummary(BaseModel):
    id: UUID
    job_type: JobType
    status: JobStatus
    workflow_run_id: UUID
    workflow_id: UUID | None = None
    workflow_name: str | None = None
    dataset_id: UUID | None = None
    dataset_name: str | None = None
    input_version_id: UUID | None = None
    input_version_number: int | None = None
    output_version_id: UUID | None = None
    output_version_number: int | None = None
    queue_name: str
    attempt_count: int
    max_attempts: int
    progress: JobProgressData
    current_step_position: int | None = None
    current_operation_code: str | None = None
    current_activity: str | None = None
    queued_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    heartbeat_at: datetime | None = None
    queue_ms: int | None = None
    execution_ms: int | None = None
    total_ms: int | None = None
    error_code: str | None = None
    error_message_safe: str | None = None
    error_category: JobErrorCategory | None = None
    retryable: bool = False
    created_at: datetime
    updated_at: datetime


class JobDetail(JobSummary):
    request_id: str | None = None
    cancel_requested_at: datetime | None = None
    cancelled_at: datetime | None = None
    attempts: list[JobAttemptData] = Field(default_factory=list)
    step_runs: list[WorkflowStepRunData] = Field(default_factory=list)
    workflow_revision: int | None = None
    workflow_run_status: str | None = None
    quality_before: float | None = None
    quality_after: float | None = None
    rows_before: int | None = None
    rows_after: int | None = None


class JobListData(BaseModel):
    items: list[JobSummary]
    page: int
    page_size: int
    total: int


class WorkflowRunAccepted(BaseModel):
    workflow_run: WorkflowRunDetail
    job: JobSummary


class OperationsHealthData(BaseModel):
    queue: dict[str, Any]
    worker: dict[str, Any]
    jobs: dict[str, int]
