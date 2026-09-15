"""Safe, registered dataset transformations.

Operations never execute user code. They accept a dataframe, an operation
code, and structured parameters, then return a deterministic result.
"""

from facilio_processing.transformations.catalog import catalog, get_operation
from facilio_processing.transformations.engine import (
    HIGH_IMPACT_ROW_REMOVAL_THRESHOLD,
    PREVIEW_EXAMPLE_LIMIT,
    apply_transformation,
    preview_transformation,
)
from facilio_processing.transformations.errors import TransformationError
from facilio_processing.transformations.result import (
    ChangeExample,
    TransformationImpact,
    TransformationResult,
)
from facilio_processing.transformations.suggestions import suggested_operations_for_issue

__all__ = [
    "HIGH_IMPACT_ROW_REMOVAL_THRESHOLD",
    "PREVIEW_EXAMPLE_LIMIT",
    "ChangeExample",
    "TransformationError",
    "TransformationImpact",
    "TransformationResult",
    "apply_transformation",
    "catalog",
    "get_operation",
    "preview_transformation",
    "suggested_operations_for_issue",
]
