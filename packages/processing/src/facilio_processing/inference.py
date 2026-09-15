"""Conservative column type classification.

Inference never rewrites cell values. String dates stay text. Integers
that happen to be 0/1 are not treated as booleans.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

import pandas as pd

from facilio_processing.types import ColumnDtype, ColumnInfo


def is_missing(value: Any) -> bool:
    if value is None:
        return True
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def infer_dtype(values: list[Any]) -> ColumnDtype:
    observed = [value for value in values if not is_missing(value)]
    if not observed:
        return "unknown"
    if all(isinstance(value, bool) for value in observed):
        return "boolean"
    if all(_is_int(value) for value in observed):
        return "integer"
    if all(_is_number(value) for value in observed):
        return "decimal"
    if all(_is_datetime(value) for value in observed):
        return "datetime"
    if all(isinstance(value, str) for value in observed):
        return "text"
    return "text"


def columns_from_frame(frame: pd.DataFrame) -> list[ColumnInfo]:
    columns: list[ColumnInfo] = []
    for index, name in enumerate(frame.columns):
        series = frame.iloc[:, index]
        columns.append(
            ColumnInfo(
                name="" if name is None else str(name),
                index=index,
                dtype=infer_dtype(series.tolist()),
            )
        )
    return columns


def _is_int(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, int) and not isinstance(value, bool):
        return True
    if isinstance(value, float):
        return value.is_integer() and not pd.isna(value)
    return False


def _is_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    return isinstance(value, int | float) and not pd.isna(value)


def _is_datetime(value: Any) -> bool:
    return isinstance(value, datetime | date | pd.Timestamp) and not pd.isna(value)
