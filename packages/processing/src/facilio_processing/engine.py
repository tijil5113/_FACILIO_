"""Public processing engine interface."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from facilio_processing.detect import detect_file_type
from facilio_processing.profiling.limits import ProfileLimits
from facilio_processing.profiling.profiler import profile_frame
from facilio_processing.profiling.types import DatasetProfile
from facilio_processing.quality.engine import evaluate_quality
from facilio_processing.quality.types import QualityResult
from facilio_processing.readers.registry import get_reader, supported_file_types
from facilio_processing.types import FileType, PreviewResult, ReadResult


@dataclass(frozen=True, slots=True)
class EngineInfo:
    """Identity of the processing engine."""

    name: str
    version: str
    status: str


def get_engine_info() -> EngineInfo:
    from facilio_processing import __version__

    return EngineInfo(
        name="facilio-processing",
        version=__version__,
        status="workflows",
    )


def runtime_library_versions() -> dict[str, str]:
    import pandas as pd

    return {"pandas": pd.__version__}


def read_dataset(
    path: Path,
    original_filename: str,
    *,
    sheet: str | None = None,
    file_type: FileType | None = None,
) -> ReadResult:
    resolved = file_type or detect_file_type(path, original_filename)
    return get_reader(resolved).read(path, sheet=sheet)


def preview_dataset(
    path: Path,
    original_filename: str,
    *,
    max_rows: int,
    max_columns: int,
    sheet: str | None = None,
    file_type: FileType | None = None,
) -> PreviewResult:
    resolved = file_type or detect_file_type(path, original_filename)
    return get_reader(resolved).preview(
        path, max_rows=max_rows, max_columns=max_columns, sheet=sheet
    )


def profile_dataset(
    path: Path,
    original_filename: str,
    *,
    sheet: str | None = None,
    file_type: FileType | None = None,
    limits: ProfileLimits | None = None,
) -> tuple[DatasetProfile, QualityResult]:
    """Read a source file and return profiling plus quality results.

    The source file is opened read-only. Quality evaluation does not modify
    cells. This function is synchronous and in-memory; it is suitable for
    Phase 4 upload bounds (default 16 MB) and can later be called from a job.
    """
    result = read_dataset(
        path, original_filename, sheet=sheet, file_type=file_type
    )
    return profile_table(
        result.frame, ingestion_columns=result.columns, limits=limits
    )


def profile_table(
    frame,
    *,
    ingestion_columns=None,
    limits: ProfileLimits | None = None,
) -> tuple[DatasetProfile, QualityResult]:
    """Profile an in-memory table without mutating it."""
    profile = profile_frame(
        frame,
        ingestion_columns=ingestion_columns,
        limits=limits,
    )
    values_by_column = {
        index: frame.iloc[:, index].tolist() for index in range(frame.shape[1])
    }
    quality = evaluate_quality(profile, values_by_column, limits=limits)
    return profile, quality


def preview_frame(
    frame,
    *,
    max_rows: int,
    max_columns: int,
) -> PreviewResult:
    from facilio_processing.inference import columns_from_frame
    from facilio_processing.serialization import frame_preview_rows

    columns = columns_from_frame(frame)
    rows, truncated_rows, truncated_columns = frame_preview_rows(
        frame, max_rows=max_rows, max_columns=max_columns
    )
    return PreviewResult(
        columns=columns[:max_columns] if truncated_columns else columns,
        rows=rows,
        row_count=int(frame.shape[0]),
        column_count=int(frame.shape[1]),
        preview_row_count=len(rows),
        truncated_rows=truncated_rows,
        truncated_columns=truncated_columns,
    )


def inspect_workbook(path: Path):
    from facilio_processing.readers.excel import ExcelReader

    return ExcelReader().inspect(path)


__all__ = [
    "EngineInfo",
    "get_engine_info",
    "inspect_workbook",
    "preview_dataset",
    "preview_frame",
    "profile_dataset",
    "profile_table",
    "read_dataset",
    "runtime_library_versions",
    "supported_file_types",
]
