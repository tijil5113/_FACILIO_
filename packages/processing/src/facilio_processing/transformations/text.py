"""Text cleaning operations."""

from __future__ import annotations

from typing import Any

import pandas as pd

from facilio_processing.inference import is_missing
from facilio_processing.transformations.base import (
    OperationDefinition,
    ParameterSpec,
    cell_example,
    copy_frame,
    require_column,
    set_column,
    values_equal,
)
from facilio_processing.transformations.errors import InvalidTransformationParametersError
from facilio_processing.transformations.result import ChangeExample

TEXT_TYPES = ("TEXT", "UNKNOWN")


def _apply_string_map(
    frame: pd.DataFrame,
    params: dict[str, Any],
    example_limit: int,
    mapper,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    column = require_column(frame, params.get("column"))
    result = copy_frame(frame)
    series = result[column]
    examples: list[ChangeExample] = []
    changed = 0
    affected_rows: set[int] = set()
    inspected = 0
    new_values: list[Any] = []
    for index, value in enumerate(series.tolist()):
        if is_missing(value) or not isinstance(value, str):
            new_values.append(value)
            continue
        inspected += 1
        updated = mapper(value)
        if updated != value:
            changed += 1
            affected_rows.add(index)
            if len(examples) < example_limit:
                examples.append(cell_example(index, column, value, updated))
            new_values.append(updated)
        else:
            new_values.append(value)
    set_column(result, column, new_values)
    return result, {
        "examples": examples,
        "changed_cell_count": changed,
        "affected_row_count": len(affected_rows),
        "removed_row_count": 0,
        "removed_column_count": 0,
        "extra": {"rows_inspected": inspected, "values_changed": changed},
        "summary": f"{changed} value{'s' if changed != 1 else ''} changed in {column}.",
    }


def apply_trim(
    frame: pd.DataFrame, params: dict[str, Any], example_limit: int
) -> tuple[pd.DataFrame, dict[str, Any]]:
    return _apply_string_map(frame, params, example_limit, str.strip)


def apply_case(
    frame: pd.DataFrame, params: dict[str, Any], example_limit: int
) -> tuple[pd.DataFrame, dict[str, Any]]:
    mode = params.get("mode")
    if mode not in {"lowercase", "uppercase", "title"}:
        raise InvalidTransformationParametersError(
            "Case mode must be lowercase, uppercase, or title.",
            details={"field": "mode"},
        )

    def mapper(value: str) -> str:
        if mode == "lowercase":
            return value.lower()
        if mode == "uppercase":
            return value.upper()
        return value.title()

    result, payload = _apply_string_map(frame, params, example_limit, mapper)
    payload["extra"]["mode"] = mode
    return result, payload


def apply_replace(
    frame: pd.DataFrame, params: dict[str, Any], example_limit: int
) -> tuple[pd.DataFrame, dict[str, Any]]:
    column = require_column(frame, params.get("column"))
    if "find" not in params:
        raise InvalidTransformationParametersError(
            "Provide the exact value to replace.",
            details={"field": "find"},
        )
    if "replacement" not in params:
        raise InvalidTransformationParametersError(
            "Provide a replacement value.",
            details={"field": "replacement"},
        )
    find = params["find"]
    replacement = params["replacement"]
    result = copy_frame(frame)
    examples: list[ChangeExample] = []
    changed = 0
    affected_rows: set[int] = set()
    new_values: list[Any] = []
    for index, value in enumerate(result[column].tolist()):
        if values_equal(value, find) and not values_equal(value, replacement):
            changed += 1
            affected_rows.add(index)
            if len(examples) < example_limit:
                examples.append(cell_example(index, column, value, replacement))
            new_values.append(replacement)
        else:
            new_values.append(value)
    set_column(result, column, new_values)
    return result, {
        "examples": examples,
        "changed_cell_count": changed,
        "affected_row_count": len(affected_rows),
        "removed_row_count": 0,
        "removed_column_count": 0,
        "extra": {},
        "summary": f"{changed} exact match{'es' if changed != 1 else ''} replaced in {column}.",
    }


TRIM = OperationDefinition(
    code="TRIM_WHITESPACE",
    display_name="Trim whitespace",
    description="Remove leading and trailing whitespace from string values. Nulls, numbers, and booleans are left unchanged.",
    category="CLEAN_TEXT",
    supported_column_types=TEXT_TYPES,
    parameters=(
        ParameterSpec("column", "column", True, "Column to trim."),
    ),
    apply=apply_trim,
)

NORMALIZE_CASE = OperationDefinition(
    code="NORMALIZE_CASE",
    display_name="Normalize case",
    description="Convert non-null string values to lowercase, uppercase, or title case. Values that already match are not counted as changed.",
    category="CLEAN_TEXT",
    supported_column_types=TEXT_TYPES,
    parameters=(
        ParameterSpec("column", "column", True, "Column to normalize."),
        ParameterSpec(
            "mode",
            "enum",
            True,
            "Case conversion mode.",
            options=("lowercase", "uppercase", "title"),
            default="lowercase",
        ),
    ),
    apply=apply_case,
)

REPLACE_VALUE = OperationDefinition(
    code="REPLACE_VALUE",
    display_name="Replace exact value",
    description="Replace values that match the source exactly. Matching is case-sensitive and does not trim or coerce types.",
    category="CLEAN_TEXT",
    supported_column_types=("TEXT", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "UNKNOWN"),
    parameters=(
        ParameterSpec("column", "column", True, "Column to search."),
        ParameterSpec("find", "value", True, "Exact value to match."),
        ParameterSpec("replacement", "value", True, "Replacement value."),
    ),
    apply=apply_replace,
    notes=("Matching is exact and case-sensitive. Empty string is distinct from null.",),
)
