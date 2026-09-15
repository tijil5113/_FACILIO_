"""Missing-value operations."""

from __future__ import annotations

from statistics import median
from typing import Any

import pandas as pd

from facilio_processing.inference import is_missing
from facilio_processing.transformations.base import (
    OperationDefinition,
    ParameterSpec,
    cell_example,
    copy_frame,
    require_column,
    require_columns,
    set_column,
)
from facilio_processing.transformations.errors import (
    InvalidTransformationParametersError,
    NoNumericValuesError,
)
from facilio_processing.transformations.result import ChangeExample


def _numeric_values(values: list[Any]) -> list[float]:
    numbers: list[float] = []
    for value in values:
        if is_missing(value) or isinstance(value, bool):
            continue
        if isinstance(value, int | float):
            numbers.append(float(value))
            continue
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                continue
            try:
                numbers.append(float(stripped))
            except ValueError:
                continue
    return numbers


def apply_fill_missing(
    frame: pd.DataFrame, params: dict[str, Any], example_limit: int
) -> tuple[pd.DataFrame, dict[str, Any]]:
    column = require_column(frame, params.get("column"))
    strategy = params.get("strategy")
    if strategy not in {"constant", "mean", "median"}:
        raise InvalidTransformationParametersError(
            "Fill strategy must be constant, mean, or median.",
            details={"field": "strategy"},
        )
    series_values = frame[column].tolist()
    fill_value: Any
    extra: dict[str, Any] = {"strategy": strategy}
    if strategy == "constant":
        if "value" not in params:
            raise InvalidTransformationParametersError(
                "Provide a constant fill value.",
                details={"field": "value"},
            )
        fill_value = params["value"]
        extra["replacement_value"] = fill_value
    else:
        numbers = _numeric_values(series_values)
        if not numbers:
            raise NoNumericValuesError(
                f'Column "{column}" has no usable numeric values for {strategy} fill.',
                details={"column": column, "strategy": strategy},
            )
        fill_value = (
            sum(numbers) / len(numbers) if strategy == "mean" else float(median(numbers))
        )
        extra["replacement_value"] = fill_value
        extra["usable_numeric_count"] = len(numbers)

    result = copy_frame(frame)
    examples: list[ChangeExample] = []
    changed = 0
    affected_rows: set[int] = set()
    new_values: list[Any] = []
    missing_count = 0
    for index, value in enumerate(series_values):
        if is_missing(value):
            missing_count += 1
            changed += 1
            affected_rows.add(index)
            if len(examples) < example_limit:
                examples.append(cell_example(index, column, value, fill_value))
            new_values.append(fill_value)
        else:
            new_values.append(value)
    set_column(result, column, new_values)
    extra["current_missing_count"] = missing_count
    summary = (
        f"Filled {changed} missing value{'s' if changed != 1 else ''} in {column} "
        f"using {strategy}"
        + (
            f" ({fill_value})."
            if strategy in {"mean", "median"}
            else "."
        )
    )
    return result, {
        "examples": examples,
        "changed_cell_count": changed,
        "affected_row_count": len(affected_rows),
        "removed_row_count": 0,
        "removed_column_count": 0,
        "extra": extra,
        "summary": summary,
    }


def apply_drop_missing(
    frame: pd.DataFrame, params: dict[str, Any], example_limit: int
) -> tuple[pd.DataFrame, dict[str, Any]]:
    columns = require_columns(frame, params.get("columns"))
    how = params.get("how", "any")
    if how not in {"any", "all"}:
        raise InvalidTransformationParametersError(
            "Missing-row mode must be any or all.",
            details={"field": "how"},
        )
    keep_mask: list[bool] = []
    examples: list[ChangeExample] = []
    removed = 0
    for index in range(len(frame)):
        flags = [is_missing(frame.iloc[index][column]) for column in columns]
        drop = any(flags) if how == "any" else all(flags)
        if drop:
            removed += 1
            if len(examples) < example_limit:
                examples.append(
                    ChangeExample(
                        kind="row_removed",
                        row_index=index,
                        reason="missing" if how == "any" else "missing_all",
                    )
                )
            keep_mask.append(False)
        else:
            keep_mask.append(True)
    result = frame.loc[keep_mask].reset_index(drop=True)
    mode_label = "any selected column is null" if how == "any" else "all selected columns are null"
    return result, {
        "examples": examples,
        "changed_cell_count": 0,
        "affected_row_count": removed,
        "removed_row_count": removed,
        "removed_column_count": 0,
        "extra": {"how": how, "columns": columns},
        "summary": (
            f"Remove a row when {mode_label}. "
            f"{removed} row{'s' if removed != 1 else ''} will be removed."
        ),
        "warnings": (
            ["This operation permanently drops rows from the new version only. The parent version is unchanged."]
            if removed
            else []
        ),
    }


FILL_MISSING = OperationDefinition(
    code="FILL_MISSING",
    display_name="Fill missing values",
    description="Replace true null values. Empty strings are not treated as missing. Mean and median ignore nulls and reject columns with no usable numbers.",
    category="MISSING_DATA",
    supported_column_types=("TEXT", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "UNKNOWN"),
    parameters=(
        ParameterSpec("column", "column", True, "Column containing missing values."),
        ParameterSpec(
            "strategy",
            "enum",
            True,
            "Replacement strategy. Mean and median apply to numeric columns only.",
            options=("constant", "mean", "median"),
            default="constant",
        ),
        ParameterSpec("value", "value", False, "Constant used when strategy is constant."),
    ),
    apply=apply_fill_missing,
)

DROP_MISSING_ROWS = OperationDefinition(
    code="DROP_MISSING_ROWS",
    display_name="Drop rows with missing values",
    description="Remove rows where any (default) or all selected columns are truly null. Empty strings are not null.",
    category="MISSING_DATA",
    supported_column_types=("TEXT", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "UNKNOWN"),
    parameters=(
        ParameterSpec("columns", "columns", True, "Columns inspected for nulls."),
        ParameterSpec(
            "how",
            "enum",
            False,
            "Drop when any selected column is null, or only when all are null.",
            options=("any", "all"),
            default="any",
        ),
    ),
    apply=apply_drop_missing,
    dataset_level=True,
    notes=("Default: drop the row if ANY selected column is truly null.",),
)
