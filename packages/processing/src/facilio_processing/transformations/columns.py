"""Column structure operations."""

from __future__ import annotations

from typing import Any

import pandas as pd

from facilio_processing.transformations.base import (
    OperationDefinition,
    ParameterSpec,
    copy_frame,
    require_column,
)
from facilio_processing.transformations.errors import (
    ColumnNameConflictError,
    InvalidTransformationParametersError,
    LastColumnCannotBeDroppedError,
)
from facilio_processing.transformations.result import ChangeExample

MAX_COLUMN_NAME_LENGTH = 200


def apply_rename(
    frame: pd.DataFrame, params: dict[str, Any], example_limit: int
) -> tuple[pd.DataFrame, dict[str, Any]]:
    del example_limit
    column = require_column(frame, params.get("column"))
    new_name = params.get("new_name")
    if not isinstance(new_name, str):
        raise InvalidTransformationParametersError(
            "Provide a new column name.",
            details={"field": "new_name"},
        )
    cleaned = new_name.strip()
    if not cleaned:
        raise InvalidTransformationParametersError(
            "Column names cannot be empty or whitespace-only.",
            details={"field": "new_name"},
        )
    if len(cleaned) > MAX_COLUMN_NAME_LENGTH:
        raise InvalidTransformationParametersError(
            f"Column names cannot exceed {MAX_COLUMN_NAME_LENGTH} characters.",
            details={"field": "new_name"},
        )
    if cleaned != new_name:
        raise InvalidTransformationParametersError(
            "Column names cannot include leading or trailing whitespace.",
            details={"field": "new_name"},
        )
    if cleaned == column:
        result = copy_frame(frame)
        return result, {
            "examples": [],
            "changed_cell_count": 0,
            "affected_row_count": 0,
            "removed_row_count": 0,
            "removed_column_count": 0,
            "extra": {},
            "summary": "The column already has this name.",
        }
    if cleaned in frame.columns:
        raise ColumnNameConflictError(
            f'A column named "{cleaned}" already exists.',
            details={"column": cleaned},
        )
    result = copy_frame(frame)
    result.rename(columns={column: cleaned}, inplace=True)
    return result, {
        "examples": [
            ChangeExample(kind="cell", column=column, before=column, after=cleaned)
        ],
        "changed_cell_count": 0,
        "affected_row_count": 0,
        "removed_row_count": 0,
        "removed_column_count": 0,
        "extra": {"from": column, "to": cleaned},
        "summary": f'Rename column "{column}" to "{cleaned}". Values are unchanged.',
    }


def apply_drop(
    frame: pd.DataFrame, params: dict[str, Any], example_limit: int
) -> tuple[pd.DataFrame, dict[str, Any]]:
    del example_limit
    column = require_column(frame, params.get("column"))
    if frame.shape[1] <= 1:
        raise LastColumnCannotBeDroppedError(
            "The last remaining column cannot be dropped.",
            details={"column": column},
        )
    result = copy_frame(frame).drop(columns=[column])
    return result, {
        "examples": [ChangeExample(kind="column_removed", column=column)],
        "changed_cell_count": 0,
        "affected_row_count": 0,
        "removed_row_count": 0,
        "removed_column_count": 1,
        "extra": {"column": column},
        "summary": f'Column "{column}" will be removed from the new version. The parent version is unchanged.',
        "warnings": [
            f'Column "{column}" will be removed from the derived version only.'
        ],
    }


RENAME_COLUMN = OperationDefinition(
    code="RENAME_COLUMN",
    display_name="Rename column",
    description="Rename a column without changing values or column order.",
    category="COLUMNS",
    supported_column_types=("TEXT", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "UNKNOWN"),
    parameters=(
        ParameterSpec("column", "column", True, "Column to rename."),
        ParameterSpec("new_name", "string", True, "New column name."),
    ),
    apply=apply_rename,
)

DROP_COLUMN = OperationDefinition(
    code="DROP_COLUMN",
    display_name="Drop column",
    description="Remove a column from the derived version. The last remaining column cannot be dropped.",
    category="COLUMNS",
    supported_column_types=("TEXT", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "UNKNOWN"),
    parameters=(ParameterSpec("column", "column", True, "Column to remove."),),
    apply=apply_drop,
    notes=("Destructive within the new version only. Parent versions remain intact.",),
)
