"""JSON-safe cell serialization for preview responses."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

import pandas as pd

from facilio_processing.inference import is_missing


def json_safe(value: Any) -> Any:
    """Convert a cell value into a JSON-serializable form without altering meaning.

    Null-like values become JSON null. Strings, booleans, and numbers keep
    their types. Datetimes become ISO-8601 strings.
    """
    if is_missing(value):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        return int(value)
    if isinstance(value, float):
        if pd.isna(value):
            return None
        return float(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, pd.Timestamp):
        if pd.isna(value):
            return None
        return value.isoformat()
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, list | dict):
        return value
    return str(value)


def frame_preview_rows(
    frame: pd.DataFrame, *, max_rows: int, max_columns: int
) -> tuple[list[list[object]], bool, bool]:
    truncated_columns = frame.shape[1] > max_columns
    truncated_rows = frame.shape[0] > max_rows
    limited = frame.iloc[:max_rows, :max_columns]
    rows: list[list[object]] = []
    for position in range(len(limited)):
        row = limited.iloc[position]
        rows.append([json_safe(cell) for cell in row.tolist()])
    return rows, truncated_rows, truncated_columns
