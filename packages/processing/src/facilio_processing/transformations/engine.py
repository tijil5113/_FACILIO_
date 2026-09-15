"""Preview and apply orchestration. Independent of Flask."""

from __future__ import annotations

from typing import Any

import pandas as pd

from facilio_processing.transformations.catalog import get_operation
from facilio_processing.transformations.result import (
    TransformationImpact,
    TransformationResult,
)

PREVIEW_EXAMPLE_LIMIT = 10
HIGH_IMPACT_ROW_REMOVAL_THRESHOLD = 0.25


def preview_transformation(
    frame: pd.DataFrame,
    operation: str,
    parameters: dict[str, Any] | None = None,
    *,
    example_limit: int = PREVIEW_EXAMPLE_LIMIT,
) -> tuple[pd.DataFrame, TransformationResult]:
    """Dry-run a transformation. Does not persist and does not mutate `frame`."""
    return _run(frame, operation, parameters or {}, example_limit=example_limit)


def apply_transformation(
    frame: pd.DataFrame,
    operation: str,
    parameters: dict[str, Any] | None = None,
    *,
    example_limit: int = PREVIEW_EXAMPLE_LIMIT,
) -> tuple[pd.DataFrame, TransformationResult]:
    """Execute a transformation in memory. Caller is responsible for persistence."""
    return _run(frame, operation, parameters or {}, example_limit=example_limit)


def _run(
    frame: pd.DataFrame,
    operation_code: str,
    parameters: dict[str, Any],
    *,
    example_limit: int,
) -> tuple[pd.DataFrame, TransformationResult]:
    definition = get_operation(operation_code)
    original = frame.copy(deep=True)
    result_frame, payload = definition.apply(original, parameters, example_limit)
    rows_before = int(frame.shape[0])
    columns_before = int(frame.shape[1])
    rows_after = int(result_frame.shape[0])
    columns_after = int(result_frame.shape[1])
    removed_rows = int(payload["removed_row_count"])
    removed_columns = int(payload["removed_column_count"])
    changed_cells = int(payload["changed_cell_count"])
    affected_rows = int(payload["affected_row_count"])
    no_op = (
        removed_rows == 0
        and removed_columns == 0
        and changed_cells == 0
        and list(result_frame.columns) == list(frame.columns)
        and rows_after == rows_before
        and columns_after == columns_before
    )
    warnings = list(payload.get("warnings") or [])
    if rows_before > 0 and removed_rows / rows_before >= HIGH_IMPACT_ROW_REMOVAL_THRESHOLD:
        percent = round((removed_rows / rows_before) * 100)
        warnings.append(
            f"This operation removes {percent}% of rows "
            f"({removed_rows} of {rows_before})."
        )
    impact = TransformationImpact(
        rows_before=rows_before,
        rows_after=rows_after,
        columns_before=columns_before,
        columns_after=columns_after,
        changed_cell_count=changed_cells,
        removed_row_count=removed_rows,
        removed_column_count=removed_columns,
        affected_row_count=affected_rows,
        no_op=no_op,
    )
    result = TransformationResult(
        operation=definition.code,
        parameters=dict(parameters),
        impact=impact,
        examples=list(payload.get("examples") or []),
        warnings=warnings,
        summary=str(payload.get("summary") or ""),
        extra=dict(payload.get("extra") or {}),
    )
    return result_frame, result
