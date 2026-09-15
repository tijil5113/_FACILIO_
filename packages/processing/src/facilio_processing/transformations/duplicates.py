"""Exact duplicate-row removal."""

from __future__ import annotations

from typing import Any

import pandas as pd

from facilio_processing.transformations.base import (
    OperationDefinition,
    ParameterSpec,
    copy_frame,
    require_columns,
)
from facilio_processing.transformations.result import ChangeExample


def apply_remove_duplicates(
    frame: pd.DataFrame, params: dict[str, Any], example_limit: int
) -> tuple[pd.DataFrame, dict[str, Any]]:
    subset = params.get("columns")
    columns = require_columns(frame, subset) if subset else list(frame.columns)
    working = copy_frame(frame)
    duplicated = working.duplicated(subset=columns, keep="first")
    examples: list[ChangeExample] = []
    removed_indices = [index for index, flag in enumerate(duplicated.tolist()) if flag]
    for index in removed_indices[:example_limit]:
        examples.append(
            ChangeExample(
                kind="row_removed",
                row_index=index,
                reason="duplicate",
            )
        )
    result = working.loc[~duplicated].reset_index(drop=True)
    removed = len(removed_indices)
    scope = "all columns" if subset is None else ", ".join(columns)
    return result, {
        "examples": examples,
        "changed_cell_count": 0,
        "affected_row_count": removed,
        "removed_row_count": removed,
        "removed_column_count": 0,
        "extra": {"columns": columns, "keep": "first"},
        "summary": (
            f"Keep the first occurrence. Duplicate determination uses {scope}. "
            f"{removed} extra duplicate row{'s' if removed != 1 else ''} will be removed."
        ),
        "warnings": (
            [
                "Duplicate determination uses only the selected columns. Other fields may differ between dropped and kept rows."
            ]
            if subset
            else []
        ),
    }


REMOVE_DUPLICATES = OperationDefinition(
    code="REMOVE_DUPLICATES",
    display_name="Remove duplicate rows",
    description="Drop extra exact duplicate rows, keeping the first occurrence. By default every column participates. An optional column subset changes what counts as a duplicate.",
    category="ROWS",
    supported_column_types=("TEXT", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "UNKNOWN"),
    parameters=(
        ParameterSpec(
            "columns",
            "columns",
            False,
            "Optional subset used to determine duplicates. Omit to use every column.",
        ),
    ),
    apply=apply_remove_duplicates,
    dataset_level=True,
    notes=("The first matching row is preserved. Later exact matches are removed.",),
)
