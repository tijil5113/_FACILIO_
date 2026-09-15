"""CSV reader.

Empty cells become null. The strings NA, N/A, null, and similar are preserved.
Duplicate column names are kept as uploaded. Delimiter detection is best-effort
for comma, semicolon, tab, and pipe; encoding is UTF-8 (with optional BOM).
"""

from __future__ import annotations

import csv
from io import StringIO
from pathlib import Path

import pandas as pd

from facilio_processing.errors import EmptyDatasetError, EmptyFileError, InvalidCsvError
from facilio_processing.inference import columns_from_frame
from facilio_processing.serialization import frame_preview_rows
from facilio_processing.types import PreviewResult, ReadResult

_SAMPLE_BYTES = 16_384
_CANDIDATE_DELIMITERS = ",;\t|"


class CsvReader:
    def read(self, path: Path, *, sheet: str | None = None) -> ReadResult:
        del sheet
        frame, encoding, delimiter = _load_csv(path)
        columns = columns_from_frame(frame)
        return ReadResult(
            frame=frame,
            columns=columns,
            row_count=int(frame.shape[0]),
            column_count=int(frame.shape[1]),
            encoding=encoding,
            delimiter=delimiter,
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
            delimiter=result.delimiter,
        )


def _load_csv(path: Path) -> tuple[pd.DataFrame, str, str]:
    if path.stat().st_size == 0:
        raise EmptyFileError("The uploaded file is empty.")
    raw = path.read_bytes()
    if b"\x00" in raw[:4096]:
        raise InvalidCsvError("The file contains binary data and is not a valid CSV.")
    try:
        text = raw.decode("utf-8-sig")
        encoding = "utf-8-sig" if raw.startswith(b"\xef\xbb\xbf") else "utf-8"
    except UnicodeDecodeError as error:
        raise InvalidCsvError(
            "The CSV could not be decoded as UTF-8. Re-save the file as UTF-8 and retry."
        ) from error

    if not text.strip():
        raise EmptyDatasetError("The CSV does not contain a header or data rows.")

    delimiter = _detect_delimiter(text)
    try:
        reader = csv.reader(StringIO(text), delimiter=delimiter)
        table = list(reader)
    except csv.Error as error:
        raise InvalidCsvError("The CSV could not be parsed.") from error

    if not table:
        raise EmptyDatasetError("The CSV does not contain a header or data rows.")

    headers = ["" if cell is None else str(cell) for cell in table[0]]
    if not any(name.strip() for name in headers) and len(table) == 1:
        raise EmptyDatasetError("The CSV does not contain a header or data rows.")
    if not headers:
        raise EmptyDatasetError("The CSV does not contain a header or data rows.")

    records: list[list[object]] = []
    for row_number, row in enumerate(table[1:], start=2):
        if len(row) > len(headers):
            raise InvalidCsvError(
                f"Row {row_number} has more fields than the header defines."
            )
        padded: list[object] = list(row) + [None] * (len(headers) - len(row))
        normalized = [_cell(value) for value in padded]
        records.append(normalized)

    frame = pd.DataFrame(records, columns=headers, dtype=object)
    return frame, encoding, delimiter


def _cell(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    return value


def _detect_delimiter(text: str) -> str:
    sample = text[:_SAMPLE_BYTES]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=_CANDIDATE_DELIMITERS)
        if dialect.delimiter in _CANDIDATE_DELIMITERS:
            return dialect.delimiter
    except csv.Error:
        pass
    return ","
