"""Linear workflow orchestration on top of the transformation registry.

Workflows are ordered sequences of registered Phase 5 operations. Preview and
execution call `apply_transformation`; they do not reimplement operations.
"""

from facilio_processing.workflows.pipeline import (
    enabled_steps,
    execute_pipeline,
    preview_pipeline,
    snapshot_steps,
    validate_against_frame,
)
from facilio_processing.workflows.schema import (
    analyze_compatibility,
    derive_input_contract,
    schema_from_columns,
    validate_workflow,
)
from facilio_processing.workflows.types import (
    MAX_ENABLED_STEPS,
    CompatibilityResult,
    InputContract,
    PipelineResult,
    PipelineStepResult,
    SchemaColumn,
    ValidationIssue,
    WorkflowStepSpec,
    WorkflowValidation,
)

__all__ = [
    "MAX_ENABLED_STEPS",
    "CompatibilityResult",
    "InputContract",
    "PipelineResult",
    "PipelineStepResult",
    "SchemaColumn",
    "ValidationIssue",
    "WorkflowStepSpec",
    "WorkflowValidation",
    "analyze_compatibility",
    "derive_input_contract",
    "enabled_steps",
    "execute_pipeline",
    "preview_pipeline",
    "schema_from_columns",
    "snapshot_steps",
    "validate_against_frame",
    "validate_workflow",
]
