"""Shared ingestion result types.

Source values are preserved. Dtype labels are conservative classifications
for display only — they are not a transformation of the stored file.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import pandas as pd

ColumnDtype = Literal[
    "text",
    "integer",
    "decimal",
    "boolean",
    "datetime",
    "unknown",
]

FileType = Literal["csv", "xlsx", "json"]


@dataclass(frozen=True, slots=True)
class ColumnInfo:
    name: str
    index: int
    dtype: ColumnDtype


@dataclass(frozen=True, slots=True)
class SheetInfo:
    name: str
    empty: bool
    hidden: bool = False


@dataclass(frozen=True, slots=True)
class ReadResult:
    """Tabular view derived from an immutable source file."""

    frame: pd.DataFrame
    columns: list[ColumnInfo]
    row_count: int
    column_count: int
    encoding: str | None = None
    delimiter: str | None = None
    selected_sheet: str | None = None


@dataclass(frozen=True, slots=True)
class PreviewResult:
    columns: list[ColumnInfo]
    rows: list[list[object]]
    row_count: int
    column_count: int
    preview_row_count: int
    truncated_rows: bool
    truncated_columns: bool
    encoding: str | None = None
    delimiter: str | None = None
    selected_sheet: str | None = None


@dataclass(frozen=True, slots=True)
class WorkbookInspection:
    sheets: list[SheetInfo] = field(default_factory=list)

    @property
    def usable(self) -> list[SheetInfo]:
        return [sheet for sheet in self.sheets if not sheet.empty]
