"""Internal derived-table artifact.

Derived versions are stored as `facilio.table.v1` JSON, not as a second copy
of the uploaded CSV/XLSX/JSON. The uploaded source remains the original
bytes. This representation preserves column order, JSON nulls, strings,
numbers, booleans, and ISO-8601 dates without introducing Parquet/pyarrow.

It is an internal persistence format, not an export format.
"""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pandas as pd

from facilio_processing.inference import columns_from_frame, is_missing
from facilio_processing.serialization import json_safe
from facilio_processing.types import ColumnDtype, ColumnInfo

FORMAT_NAME = "facilio.table.v1"


def write_table(path: Path, frame: pd.DataFrame) -> None:
    columns = columns_from_frame(frame)
    rows: list[list[Any]] = []
    for position in range(len(frame)):
        row = frame.iloc[position]
        rows.append([json_safe(cell) for cell in row.tolist()])
    payload = {
        "format": FORMAT_NAME,
        "columns": [
            {"name": column.name, "index": column.index, "dtype": column.dtype}
            for column in columns
        ],
        "rows": rows,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, allow_nan=False),
        encoding="utf-8",
    )


def read_table(path: Path) -> tuple[pd.DataFrame, list[ColumnInfo]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("format") != FORMAT_NAME:
        msg = "Unsupported derived table format."
        raise ValueError(msg)
    column_payloads = payload.get("columns") or []
    columns = [
        ColumnInfo(
            name=str(item["name"]),
            index=int(item["index"]),
            dtype=item["dtype"],  # type: ignore[arg-type]
        )
        for item in column_payloads
    ]
    names = [column.name for column in columns]
    data: dict[str, list[Any]] = {name: [] for name in names}
    for row in payload.get("rows") or []:
        for index, name in enumerate(names):
            raw = row[index] if index < len(row) else None
            data[name].append(_restore_cell(raw, columns[index].dtype))
    frame = pd.DataFrame({name: pd.Series(values, dtype=object) for name, values in data.items()})
    return frame, columns


def _restore_cell(value: Any, dtype: ColumnDtype) -> Any:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if dtype == "integer":
        if isinstance(value, bool):
            return value
        if isinstance(value, int):
            return value
        if isinstance(value, float) and value.is_integer():
            return int(value)
        return value
    if dtype == "decimal":
        if isinstance(value, int | float) and not isinstance(value, bool):
            return float(value)
        return value
    if dtype == "boolean":
        return bool(value) if isinstance(value, bool) else value
    if dtype == "datetime":
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value)
            except ValueError:
                try:
                    return date.fromisoformat(value)
                except ValueError:
                    return value
        return value
    return value
