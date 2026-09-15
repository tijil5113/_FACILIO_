"""Dataset reader protocol."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from facilio_processing.types import PreviewResult, ReadResult


class DatasetReader(Protocol):
    def read(self, path: Path, *, sheet: str | None = None) -> ReadResult: ...

    def preview(
        self,
        path: Path,
        *,
        max_rows: int,
        max_columns: int,
        sheet: str | None = None,
    ) -> PreviewResult: ...
