"""JSON reader for tabular structures.

Supported:
- array of objects
- object whose values are equal-length arrays (columnar)

Nested objects and arrays are stored as JSON text in a single cell.
They are not flattened into additional columns.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from facilio_processing.errors import (
    EmptyDatasetError,
    InvalidJsonError,
    NonTabularJsonError,
)
from facilio_processing.inference import columns_from_frame
from facilio_processing.serialization import frame_preview_rows
from facilio_processing.types import PreviewResult, ReadResult


class JsonReader:
    def read(self, path: Path, *, sheet: str | None = None) -> ReadResult:
        del sheet
        frame = _load_json(path)
        columns = columns_from_frame(frame)
        return ReadResult(
            frame=frame,
            columns=columns,
            row_count=int(frame.shape[0]),
            column_count=int(frame.shape[1]),
            encoding="utf-8",
        )

    def preview(
        self,
        path: Path,
        *,
        max_rows: int,
        max_columns: int,
        sheet: str | None = None,
    ) -> PreviewResult:
        result = self.read(path, sheet=sheet)
        rows, truncated_rows, truncated_columns = frame_preview_rows(
            result.frame, max_rows=max_rows, max_columns=max_columns
        )
        return PreviewResult(
            columns=result.columns[:max_columns],
            rows=rows,
            row_count=result.row_count,
            column_count=result.column_count,
            preview_row_count=len(rows),
            truncated_rows=truncated_rows,
            truncated_columns=truncated_columns,
            encoding=result.encoding,
        )


def _load_json(path: Path) -> pd.DataFrame:
    raw = path.read_bytes()
    try:
        payload = json.loads(raw.decode("utf-8-sig"))
    except UnicodeDecodeError as error:
        raise InvalidJsonError("The JSON file could not be decoded as UTF-8.") from error
    except json.JSONDecodeError as error:
        raise InvalidJsonError("The file is not valid JSON.") from error

    records, columns = _tabular_records(payload)
    frame = pd.DataFrame(records, columns=columns, dtype=object)
    return frame


def _tabular_records(payload: Any) -> tuple[list[list[object]], list[str]]:
    if isinstance(payload, list):
        return _from_array(payload)
    if isinstance(payload, dict):
        return _from_columnar_object(payload)
    raise NonTabularJsonError(
        "JSON must be an array of objects, or an object of equal-length arrays."
    )


def _from_array(payload: list[Any]) -> tuple[list[list[object]], list[str]]:
    if not payload:
        raise EmptyDatasetError("The JSON array does not contain any records.")
    if all(isinstance(item, dict) for item in payload):
        columns: list[str] = []
        seen: set[str] = set()
        for item in payload:
            for key in item:
                name = str(key)
                if name not in seen:
                    seen.add(name)
                    columns.append(name)
        if not columns:
            raise NonTabularJsonError(
                "JSON objects do not contain any fields that can form columns."
            )
        rows = [[_json_cell(item.get(column)) for column in columns] for item in payload]
        return rows, columns
    raise NonTabularJsonError(
        "JSON arrays must contain objects to be ingested as a table."
    )


def _from_columnar_object(payload: dict[Any, Any]) -> tuple[list[list[object]], list[str]]:
    if not payload:
        raise NonTabularJsonError("The JSON object does not contain tabular columns.")
    values = list(payload.values())
    if not all(isinstance(value, list) for value in values):
        raise NonTabularJsonError(
            "JSON objects are tabular only when every value is an array of the same length."
        )
    lengths = {len(value) for value in values}
    if len(lengths) != 1:
        raise NonTabularJsonError(
            "JSON column arrays must all have the same length."
        )
    length = next(iter(lengths))
    if length == 0:
        raise EmptyDatasetError("The JSON object does not contain any records.")
    columns = [str(key) for key in payload]
    rows: list[list[object]] = []
    for index in range(length):
        rows.append([_json_cell(payload[key][index]) for key in payload])
    return rows, columns


def _json_cell(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, dict | list):
        return json.dumps(value, ensure_ascii=False)
    return value
