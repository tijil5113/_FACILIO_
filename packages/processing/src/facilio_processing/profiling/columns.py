"""Per-column profiling. Read-only over the source series."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from facilio_processing.inference import is_missing
from facilio_processing.profiling.inference import (
    classify_cardinality,
    infer_profile_type,
    infer_semantic_hint,
    is_email_value,
)
from facilio_processing.profiling.jsonutil import canonical_key, percentage
from facilio_processing.profiling.limits import ProfileLimits
from facilio_processing.profiling.patterns import MISSING_TOKENS, column_observations
from facilio_processing.profiling.statistics import (
    boolean_statistics,
    date_statistics,
    numeric_statistics,
    text_statistics,
)
from facilio_processing.profiling.types import ColumnProfile, SemanticHint


def profile_column(
    values: list[Any],
    *,
    name: str,
    position: int,
    ingestion_dtype: str | None,
    limits: ProfileLimits,
) -> ColumnProfile:
    row_count = len(values)
    null_count = sum(1 for value in values if is_missing(value))
    non_null_count = row_count - null_count
    strings = [value for value in values if isinstance(value, str)]
    empty_string_count = sum(1 for item in strings if item == "")
    whitespace_count = sum(1 for item in strings if item != "" and item != item.strip())
    case_variant_value_count = _case_variant_value_count(strings)
    potential_missing_token_count = sum(
        1 for item in strings if item.strip().lower() in MISSING_TOKENS
    )
    distinct_count = len({canonical_key(value) for value in values if not is_missing(value)})
    detected_type = infer_profile_type(values)
    cardinality = classify_cardinality(
        row_count=row_count,
        non_null_count=non_null_count,
        distinct_count=distinct_count,
    )
    null_percentage = percentage(null_count, row_count)
    distinct_percentage = percentage(distinct_count, non_null_count)
    semantic_hint = infer_semantic_hint(
        name=name,
        detected_type=detected_type,
        values=values,
        cardinality=cardinality,
        non_null_count=non_null_count,
    )
    observations = column_observations(
        values,
        detected_type=detected_type,
        cardinality=cardinality,
        semantic_hint=semantic_hint,
        null_percentage=null_percentage,
        limits=limits,
    )
    numeric = (
        numeric_statistics(values, missing=null_count, limits=limits)
        if detected_type in {"INTEGER", "DECIMAL"}
        else None
    )
    text = text_statistics(values, limits=limits) if detected_type == "TEXT" else None
    boolean = (
        boolean_statistics(values, missing=null_count) if detected_type == "BOOLEAN" else None
    )
    date = (
        date_statistics(values, missing=null_count)
        if detected_type in {"DATE", "DATETIME"}
        else None
    )
    return ColumnProfile(
        name=name,
        position=position,
        detected_type=detected_type,
        ingestion_dtype=ingestion_dtype,
        semantic_hint=semantic_hint,
        row_count=row_count,
        non_null_count=non_null_count,
        null_count=null_count,
        null_percentage=null_percentage,
        distinct_count=distinct_count,
        distinct_percentage=distinct_percentage,
        cardinality=cardinality,
        empty_string_count=empty_string_count,
        whitespace_count=whitespace_count,
        case_variant_value_count=case_variant_value_count,
        invalid_email_count=_invalid_email_count(semantic_hint, values),
        potential_missing_token_count=potential_missing_token_count,
        observations=observations,
        numeric=numeric,
        text=text,
        boolean=boolean,
        date=date,
    )


def _case_variant_value_count(strings: list[str]) -> int:
    counts = Counter(item.strip() for item in strings if item.strip())
    groups: dict[str, int] = defaultdict(int)
    variants: dict[str, int] = defaultdict(int)
    for value, count in counts.items():
        key = value.casefold()
        groups[key] += count
        variants[key] += 1
    return sum(groups[key] for key, n in variants.items() if n > 1)


def _invalid_email_count(semantic_hint: SemanticHint | None, values: list[Any]) -> int:
    if semantic_hint != "EMAIL":
        return 0
    return sum(
        1
        for value in values
        if isinstance(value, str) and value.strip() and not is_email_value(value)
    )
