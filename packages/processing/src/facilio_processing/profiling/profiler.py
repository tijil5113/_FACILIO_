"""Dataset profiler. Independent of Flask. Never mutates the frame."""

from __future__ import annotations

from collections import Counter, defaultdict

import pandas as pd

from facilio_processing.inference import is_missing
from facilio_processing.profiling.columns import profile_column
from facilio_processing.profiling.jsonutil import canonical_key, percentage
from facilio_processing.profiling.limits import PROFILE_VERSION, ProfileLimits
from facilio_processing.profiling.types import (
    ColumnProfile,
    DatasetProfile,
    DatasetSummaryStats,
    DuplicateGroup,
    empty_type_distribution,
)
from facilio_processing.types import ColumnInfo


def profile_frame(
    frame: pd.DataFrame,
    *,
    ingestion_columns: list[ColumnInfo] | None = None,
    limits: ProfileLimits | None = None,
    profile_version: str = PROFILE_VERSION,
) -> DatasetProfile:
    """Analyze a tabular frame without modifying cells, headers, or dtypes in place."""
    resolved = limits or ProfileLimits()
    working = frame
    row_count = int(working.shape[0])
    column_count = int(working.shape[1])
    ingestion_by_index = {
        column.index: column.dtype for column in (ingestion_columns or [])
    }
    columns: list[ColumnProfile] = []
    missing_cells = 0
    for position, name in enumerate(working.columns):
        series = working.iloc[:, position]
        values = series.tolist()
        missing_cells += sum(1 for value in values if is_missing(value))
        label = "" if name is None else str(name)
        columns.append(
            profile_column(
                values,
                name=label,
                position=position,
                ingestion_dtype=ingestion_by_index.get(position),
                limits=resolved,
            )
        )
    total_cells = row_count * column_count
    complete_cells = total_cells - missing_cells
    extra_duplicates, unique_rows, groups = _duplicate_analysis(
        working, limits=resolved
    )
    distribution = empty_type_distribution()
    for column in columns:
        distribution[column.detected_type] = distribution.get(column.detected_type, 0) + 1
    memory = _memory_estimate(working)
    summary = DatasetSummaryStats(
        row_count=row_count,
        column_count=column_count,
        total_cells=total_cells,
        missing_cells=missing_cells,
        missing_percentage=percentage(missing_cells, total_cells),
        complete_cells=complete_cells,
        complete_percentage=percentage(complete_cells, total_cells),
        duplicate_rows=extra_duplicates,
        duplicate_percentage=percentage(extra_duplicates, row_count),
        unique_rows=unique_rows,
        memory_estimate_bytes=memory,
        type_distribution=distribution,
        duplicate_groups=groups,
    )
    return DatasetProfile(
        profile_version=profile_version,
        summary=summary,
        columns=columns,
    )


def _duplicate_analysis(
    frame: pd.DataFrame, *, limits: ProfileLimits
) -> tuple[int, int, list[DuplicateGroup]]:
    row_count = int(frame.shape[0])
    if row_count == 0:
        return 0, 0, []
    keys: list[tuple[tuple[str, object], ...]] = []
    for position in range(row_count):
        row = frame.iloc[position].tolist()
        keys.append(tuple(canonical_key(cell) for cell in row))
    counts = Counter(keys)
    extra = sum(count - 1 for count in counts.values() if count > 1)
    unique_rows = len(counts)
    index_map: dict[tuple[tuple[str, object], ...], list[int]] = defaultdict(list)
    for index, key in enumerate(keys):
        if counts[key] > 1:
            index_map[key].append(index)
    ranked = sorted(index_map.values(), key=lambda items: (-len(items), items[0]))
    groups = [
        DuplicateGroup(row_indices=items[: limits.evidence], count=len(items))
        for items in ranked[: limits.duplicate_groups]
    ]
    return extra, unique_rows, groups


def _memory_estimate(frame: pd.DataFrame) -> int | None:
    try:
        return int(frame.memory_usage(deep=True).sum())
    except (TypeError, ValueError, AttributeError):
        return None
