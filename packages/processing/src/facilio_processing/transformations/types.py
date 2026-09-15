"""Conservative explicit type conversion."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

import pandas as pd

from facilio_processing.inference import is_missing
from facilio_processing.serialization import json_safe
from facilio_processing.transformations.base import (
    OperationDefinition,
    ParameterSpec,
    cell_example,
    copy_frame,
    require_column,
    set_column,
)
from facilio_processing.transformations.errors import (
    CastFailedError,
    InvalidTransformationParametersError,
)
from facilio_processing.transformations.result import ChangeExample

TARGETS = ("TEXT", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME")
EVIDENCE_LIMIT = 8


def _as_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str) and value.strip() and _is_int_string(value.strip()):
        return int(value.strip())
    return None


def _is_int_string(value: str) -> bool:
    if value.startswith("-"):
        return value[1:].isdigit() and bool(value[1:])
    return value.isdigit()


def _as_float(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def _as_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and not isinstance(value, bool) and value in {0, 1}:
        return bool(value)
    if isinstance(value, str):
        lowered = value.lower()
        if lowered == "true":
            return True
        if lowered == "false":
            return False
    return None


def _as_datetime(value: Any, *, date_only: bool) -> date | datetime | None:
    if isinstance(value, pd.Timestamp):
        if pd.isna(value):
            return None
        return value.date() if date_only else value.to_pydatetime()
    if isinstance(value, datetime):
        return value.date() if date_only else value
    if isinstance(value, date):
        return value if date_only else None
    if isinstance(value, str):
        text = value.strip()
        if date_only:
            try:
                return date.fromisoformat(text)
            except ValueError:
                return None
        try:
            return datetime.fromisoformat(text)
        except ValueError:
            return None
    return None


def _convert(value: Any, target: str) -> tuple[Any, bool]:
    if is_missing(value):
        return None, True
    if target == "TEXT":
        if isinstance(value, str):
            return value, True
        return str(value), True
    if target == "INTEGER":
        converted = _as_int(value)
        return converted, converted is not None
    if target == "DECIMAL":
        converted = _as_float(value)
        return converted, converted is not None
    if target == "BOOLEAN":
        converted = _as_bool(value)
        return converted, converted is not None
    if target == "DATE":
        converted = _as_datetime(value, date_only=True)
        return converted, converted is not None
    converted = _as_datetime(value, date_only=False)
    return converted, converted is not None


def apply_cast(
    frame: pd.DataFrame, params: dict[str, Any], example_limit: int
) -> tuple[pd.DataFrame, dict[str, Any]]:
    column = require_column(frame, params.get("column"))
    target = params.get("target_type")
    if target not in TARGETS:
        raise InvalidTransformationParametersError(
            "Choose a supported target type.",
            details={"field": "target_type"},
        )
    values = frame[column].tolist()
    converted: list[Any] = []
    incompatible: list[dict[str, Any]] = []
    examples: list[ChangeExample] = []
    changed = 0
    affected_rows: set[int] = set()
    for index, value in enumerate(values):
        new_value, ok = _convert(value, target)
        if not ok:
            if len(incompatible) < EVIDENCE_LIMIT:
                incompatible.append(
                    {
                        "row_index": index,
                        "value": json_safe(value),
                    }
                )
            continue
        converted.append(new_value)
        if not (
            (is_missing(value) and is_missing(new_value)) or value == new_value
        ):
            changed += 1
            affected_rows.add(index)
            if len(examples) < example_limit:
                examples.append(cell_example(index, column, value, new_value))
    incompatible_count = _count_incompatible(values, target)
    if incompatible_count:
        raise CastFailedError(
            (
                f'Cannot convert "{column}" to {target}. '
                f"{incompatible_count} incompatible value"
                f"{'s' if incompatible_count != 1 else ''} detected."
            ),
            details={
                "column": column,
                "target_type": target,
                "incompatible_count": incompatible_count,
                "evidence": incompatible,
            },
        )
    result = copy_frame(frame)
    set_column(result, column, converted)
    return result, {
        "examples": examples,
        "changed_cell_count": changed,
        "affected_row_count": len(affected_rows),
        "removed_row_count": 0,
        "removed_column_count": 0,
        "extra": {"target_type": target},
        "summary": f"Convert {column} to {target}. {changed} value{'s' if changed != 1 else ''} would change.",
    }


def _count_incompatible(values: list[Any], target: str) -> int:
    count = 0
    for value in values:
        _, ok = _convert(value, target)
        if not ok:
            count += 1
    return count


CAST_TYPE = OperationDefinition(
    code="CAST_TYPE",
    display_name="Change type",
    description="Convert a column to TEXT, INTEGER, DECIMAL, BOOLEAN, DATE, or DATETIME. Incompatible values reject the conversion; they are not silently turned into null.",
    category="COLUMNS",
    supported_column_types=("TEXT", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "UNKNOWN"),
    parameters=(
        ParameterSpec("column", "column", True, "Column to convert."),
        ParameterSpec(
            "target_type",
            "enum",
            True,
            "Target type.",
            options=TARGETS,
        ),
    ),
    apply=apply_cast,
    notes=(
        "BOOLEAN accepts true/false (any case) and integer 0/1 only.",
        "DATE requires ISO-8601 calendar dates. DATETIME requires ISO-8601 datetimes.",
    ),
)
