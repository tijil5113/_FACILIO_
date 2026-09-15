"""Workflow pipeline types. Independent of Flask and persistence."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from dataclasses import field as data_field
from typing import Any, Literal

from facilio_processing.transformations.result import (
    ChangeExample,
    TransformationImpact,
)

MAX_ENABLED_STEPS = 50

Severity = Literal["error", "warning"]
CompatibilityStatus = Literal["COMPATIBLE", "INCOMPATIBLE"]
StepRunStatus = Literal["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "SKIPPED", "CANCELLED"]


@dataclass(frozen=True, slots=True)
class WorkflowStepSpec:
    """One ordered operation in a reusable workflow definition."""

    id: str
    position: int
    operation_code: str
    parameters: dict[str, Any]
    enabled: bool = True


@dataclass(frozen=True, slots=True)
class SchemaColumn:
    name: str
    dtype: str


@dataclass(frozen=True, slots=True)
class ValidationIssue:
    code: str
    message: str
    severity: Severity = "error"
    step_id: str | None = None
    position: int | None = None
    field: str | None = None
    column: str | None = None
    details: dict[str, Any] = data_field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class ContractColumn:
    name: str
    dtype: str
    numeric_compatible: bool = False


@dataclass(frozen=True, slots=True)
class InputContract:
    columns: tuple[ContractColumn, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {"columns": [asdict(item) for item in self.columns]}


@dataclass(frozen=True, slots=True)
class CompatibilityResult:
    status: CompatibilityStatus
    reasons: tuple[ValidationIssue, ...] = ()

    @property
    def compatible(self) -> bool:
        return self.status == "COMPATIBLE"

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "compatible": self.compatible,
            "reasons": [item.to_dict() for item in self.reasons],
        }


@dataclass(frozen=True, slots=True)
class StepValidation:
    step_id: str
    position: int
    operation_code: str
    enabled: bool
    valid: bool
    schema_before: tuple[SchemaColumn, ...]
    schema_after: tuple[SchemaColumn, ...]
    issues: tuple[ValidationIssue, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "step_id": self.step_id,
            "position": self.position,
            "operation_code": self.operation_code,
            "enabled": self.enabled,
            "valid": self.valid,
            "schema_before": [asdict(item) for item in self.schema_before],
            "schema_after": [asdict(item) for item in self.schema_after],
            "issues": [item.to_dict() for item in self.issues],
        }


@dataclass(frozen=True, slots=True)
class WorkflowValidation:
    valid: bool
    empty: bool
    issues: tuple[ValidationIssue, ...]
    steps: tuple[StepValidation, ...]
    contract: InputContract
    compatibility: CompatibilityResult | None
    projected_schema: tuple[SchemaColumn, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "valid": self.valid,
            "empty": self.empty,
            "issues": [item.to_dict() for item in self.issues],
            "steps": [item.to_dict() for item in self.steps],
            "contract": self.contract.to_dict(),
            "compatibility": (
                None if self.compatibility is None else self.compatibility.to_dict()
            ),
            "projected_schema": [asdict(item) for item in self.projected_schema],
        }


@dataclass(frozen=True, slots=True)
class PipelineStepResult:
    step_id: str
    position: int
    operation_code: str
    parameters: dict[str, Any]
    status: StepRunStatus
    impact: TransformationImpact | None
    examples: tuple[ChangeExample, ...] = ()
    warnings: tuple[str, ...] = ()
    summary: str = ""
    duration_ms: int = 0
    error_code: str | None = None
    error_message: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "step_id": self.step_id,
            "position": self.position,
            "operation_code": self.operation_code,
            "parameters": dict(self.parameters),
            "status": self.status,
            "impact": None if self.impact is None else asdict(self.impact),
            "examples": [asdict(item) for item in self.examples],
            "warnings": list(self.warnings),
            "summary": self.summary,
            "duration_ms": self.duration_ms,
            "error_code": self.error_code,
            "error_message": self.error_message,
        }


@dataclass(frozen=True, slots=True)
class PipelineResult:
    steps: tuple[PipelineStepResult, ...]
    failed: bool
    no_op: bool
    rows_before: int
    rows_after: int
    columns_before: int
    columns_after: int
    duration_ms: int
    error_code: str | None = None
    error_message: str | None = None
    cancelled: bool = False
    extra: dict[str, Any] = data_field(default_factory=dict)
