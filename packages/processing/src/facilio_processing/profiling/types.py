"""Profiling result types.

Physical types (TEXT, INTEGER, …) are distinct from optional semantic hints
such as EMAIL. Ingestion dtypes from Phase 3 are preserved separately.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

from facilio_processing.profiling.limits import PROFILE_VERSION

ProfileType = Literal[
    "TEXT",
    "INTEGER",
    "DECIMAL",
    "BOOLEAN",
    "DATE",
    "DATETIME",
    "UNKNOWN",
]

CardinalityClass = Literal["CONSTANT", "LOW", "MEDIUM", "HIGH", "UNIQUE"]
SemanticHint = Literal["EMAIL", "IDENTIFIER"]


@dataclass(frozen=True, slots=True)
class TopValue:
    value: str
    count: int
    percentage: float | None


@dataclass(frozen=True, slots=True)
class HistogramBin:
    start: float
    end: float
    count: int


@dataclass(frozen=True, slots=True)
class NumericStatistics:
    count: int
    missing: int
    distinct: int
    minimum: float | int | None
    maximum: float | int | None
    mean: float | None
    median: float | None
    stddev: float | None
    percentile_25: float | None
    percentile_75: float | None
    zero_count: int
    negative_count: int
    histogram: list[HistogramBin] | None = None


@dataclass(frozen=True, slots=True)
class TextStatistics:
    min_length: int | None
    max_length: int | None
    avg_length: float | None
    empty_string_count: int
    top_values: list[TopValue]


@dataclass(frozen=True, slots=True)
class BooleanStatistics:
    true_count: int
    false_count: int
    missing_count: int
    true_percentage: float | None
    false_percentage: float | None


@dataclass(frozen=True, slots=True)
class DateStatistics:
    minimum: str | None
    maximum: str | None
    range_days: float | None
    distinct_count: int
    missing_count: int


@dataclass(frozen=True, slots=True)
class DuplicateGroup:
    row_indices: list[int]
    count: int


@dataclass(frozen=True, slots=True)
class ColumnProfile:
    name: str
    position: int
    detected_type: ProfileType
    ingestion_dtype: str | None
    semantic_hint: SemanticHint | None
    row_count: int
    non_null_count: int
    null_count: int
    null_percentage: float | None
    distinct_count: int
    distinct_percentage: float | None
    cardinality: CardinalityClass
    empty_string_count: int
    whitespace_count: int
    case_variant_value_count: int
    invalid_email_count: int
    potential_missing_token_count: int
    observations: list[str]
    numeric: NumericStatistics | None = None
    text: TextStatistics | None = None
    boolean: BooleanStatistics | None = None
    date: DateStatistics | None = None


@dataclass(frozen=True, slots=True)
class DatasetSummaryStats:
    row_count: int
    column_count: int
    total_cells: int
    missing_cells: int
    missing_percentage: float | None
    complete_cells: int
    complete_percentage: float | None
    duplicate_rows: int
    duplicate_percentage: float | None
    unique_rows: int
    memory_estimate_bytes: int | None
    type_distribution: dict[str, int]
    duplicate_groups: list[DuplicateGroup] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class DatasetProfile:
    profile_version: str
    summary: DatasetSummaryStats
    columns: list[ColumnProfile]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def empty_type_distribution() -> dict[str, int]:
    return {
        "TEXT": 0,
        "INTEGER": 0,
        "DECIMAL": 0,
        "BOOLEAN": 0,
        "DATE": 0,
        "DATETIME": 0,
        "UNKNOWN": 0,
    }


__all__ = [
    "PROFILE_VERSION",
    "BooleanStatistics",
    "CardinalityClass",
    "ColumnProfile",
    "DatasetProfile",
    "DatasetSummaryStats",
    "DateStatistics",
    "DuplicateGroup",
    "HistogramBin",
    "NumericStatistics",
    "ProfileType",
    "SemanticHint",
    "TextStatistics",
    "TopValue",
    "empty_type_distribution",
]
