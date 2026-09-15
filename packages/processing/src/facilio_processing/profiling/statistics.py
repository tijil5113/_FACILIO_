"""Type-specific statistics. Source values are never rewritten."""

from __future__ import annotations

from collections import Counter
from datetime import date, datetime
from typing import Any

import numpy as np

from facilio_processing.inference import is_missing
from facilio_processing.profiling.inference import (
    coerce_number,
    parse_bool,
    parse_iso_datetime,
)
from facilio_processing.profiling.jsonutil import (
    display_value,
    percentage,
    round_float,
)
from facilio_processing.profiling.limits import ProfileLimits
from facilio_processing.profiling.types import (
    BooleanStatistics,
    DateStatistics,
    HistogramBin,
    NumericStatistics,
    TextStatistics,
    TopValue,
)


def numeric_statistics(
    values: list[Any],
    *,
    missing: int,
    limits: ProfileLimits,
) -> NumericStatistics:
    numbers: list[float] = []
    for value in values:
        if is_missing(value):
            continue
        parsed = coerce_number(value)
        if parsed is not None:
            numbers.append(parsed)
    count = len(numbers)
    distinct = len(set(numbers))
    zero_count = sum(1 for item in numbers if item == 0)
    negative_count = sum(1 for item in numbers if item < 0)
    if not numbers:
        return NumericStatistics(
            count=0,
            missing=missing,
            distinct=0,
            minimum=None,
            maximum=None,
            mean=None,
            median=None,
            stddev=None,
            percentile_25=None,
            percentile_75=None,
            zero_count=0,
            negative_count=0,
            histogram=None,
        )
    array = np.asarray(numbers, dtype=np.float64)
    stddev = None
    if count >= 2:
        std = float(np.std(array, ddof=1))
        stddev = round_float(std if np.isfinite(std) else None)
    histogram = _histogram(array, limits.histogram_bins) if count >= 5 else None
    return NumericStatistics(
        count=count,
        missing=missing,
        distinct=distinct,
        minimum=round_float(float(np.min(array))),
        maximum=round_float(float(np.max(array))),
        mean=round_float(float(np.mean(array))),
        median=round_float(float(np.median(array))),
        stddev=stddev,
        percentile_25=round_float(float(np.percentile(array, 25))),
        percentile_75=round_float(float(np.percentile(array, 75))),
        zero_count=zero_count,
        negative_count=negative_count,
        histogram=histogram,
    )


def text_statistics(
    values: list[Any],
    *,
    limits: ProfileLimits,
) -> TextStatistics:
    strings = [value for value in values if isinstance(value, str)]
    empty_string_count = sum(1 for item in strings if item == "")
    lengths = [len(item) for item in strings]
    avg = round_float(sum(lengths) / len(lengths)) if lengths else None
    return TextStatistics(
        min_length=min(lengths) if lengths else None,
        max_length=max(lengths) if lengths else None,
        avg_length=avg,
        empty_string_count=empty_string_count,
        top_values=_top_values(strings, limits=limits),
    )


def boolean_statistics(values: list[Any], *, missing: int) -> BooleanStatistics:
    parsed = [parse_bool(value) for value in values]
    known = [item for item in parsed if item is not None]
    true_count = sum(1 for item in known if item)
    false_count = sum(1 for item in known if item is False)
    non_null = true_count + false_count
    return BooleanStatistics(
        true_count=true_count,
        false_count=false_count,
        missing_count=missing,
        true_percentage=percentage(true_count, non_null),
        false_percentage=percentage(false_count, non_null),
    )


def date_statistics(values: list[Any], *, missing: int) -> DateStatistics:
    parsed: list[datetime | date] = []
    for value in values:
        if is_missing(value):
            continue
        item = parse_iso_datetime(value)
        if item is not None:
            parsed.append(item)
    if not parsed:
        return DateStatistics(
            minimum=None,
            maximum=None,
            range_days=None,
            distinct_count=0,
            missing_count=missing,
        )
    as_dt = [
        item if isinstance(item, datetime) else datetime.combine(item, datetime.min.time())
        for item in parsed
    ]
    minimum = min(as_dt)
    maximum = max(as_dt)
    delta = (maximum - minimum).total_seconds() / 86400.0
    return DateStatistics(
        minimum=_iso(minimum),
        maximum=_iso(maximum),
        range_days=round_float(delta, 4),
        distinct_count=len(set(as_dt)),
        missing_count=missing,
    )


def _top_values(values: list[str], *, limits: ProfileLimits) -> list[TopValue]:
    if not values:
        return []
    counts = Counter(values)
    total = len(values)
    ranked = counts.most_common(limits.top_values)
    return [
        TopValue(
            value=display_value(item, max_chars=limits.value_display_chars),
            count=count,
            percentage=percentage(count, total),
        )
        for item, count in ranked
    ]


def _histogram(array: np.ndarray, bins: int) -> list[HistogramBin] | None:
    if array.size == 0:
        return None
    lo = float(np.min(array))
    hi = float(np.max(array))
    if not np.isfinite(lo) or not np.isfinite(hi):
        return None
    bin_count = max(1, min(bins, int(array.size)))
    if lo == hi:
        return [HistogramBin(start=round_float(lo) or 0.0, end=round_float(hi) or 0.0, count=int(array.size))]
    counts, edges = np.histogram(array, bins=bin_count)
    result: list[HistogramBin] = []
    for index, count in enumerate(counts.tolist()):
        result.append(
            HistogramBin(
                start=round_float(float(edges[index])) or 0.0,
                end=round_float(float(edges[index + 1])) or 0.0,
                count=int(count),
            )
        )
    return result


def _iso(value: datetime) -> str:
    if value.hour == 0 and value.minute == 0 and value.second == 0 and value.microsecond == 0:
        return value.date().isoformat()
    return value.isoformat()
