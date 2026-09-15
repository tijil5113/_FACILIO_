"""High-confidence deterministic observations. These never transform data."""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Any

from facilio_processing.inference import is_missing
from facilio_processing.profiling.inference import coerce_number, is_email_value
from facilio_processing.profiling.jsonutil import display_value
from facilio_processing.profiling.limits import ProfileLimits
from facilio_processing.profiling.types import CardinalityClass, ProfileType, SemanticHint

MISSING_TOKENS = frozenset(
    {
        "n/a",
        "na",
        "none",
        "null",
        "nil",
        "unknown",
        "missing",
        "-",
        "--",
        ".",
    }
)

_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_SLASH_DATE = re.compile(r"^\d{1,2}/\d{1,2}/\d{2,4}$")
_LONG_DATE = re.compile(
    r"^(january|february|march|april|may|june|july|august|september|"
    r"october|november|december)\s+\d{1,2},?\s+\d{4}$",
    re.IGNORECASE,
)
_LONG_DATE_ALT = re.compile(
    r"^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+\d{1,2},?\s+\d{4}$",
    re.IGNORECASE,
)


def column_observations(
    values: list[Any],
    *,
    detected_type: ProfileType,
    cardinality: CardinalityClass,
    semantic_hint: SemanticHint | None,
    null_percentage: float | None,
    limits: ProfileLimits,
) -> list[str]:
    codes: list[str] = []
    observed = [value for value in values if not is_missing(value)]
    strings = [value for value in observed if isinstance(value, str)]

    if any(isinstance(value, str) and value == "" for value in observed):
        codes.append("EMPTY_STRINGS")
    if any(_has_padding(value) for value in strings):
        codes.append("LEADING_TRAILING_WHITESPACE")
    if _has_case_variants(strings):
        codes.append("CASE_VARIATION")
    if _potential_missing_tokens(strings):
        codes.append("POTENTIAL_MISSING_TOKENS")
    if detected_type == "TEXT" and _mixed_numeric_text(observed):
        codes.append("MIXED_TYPE_VALUES")
    if detected_type == "TEXT" and _mixed_date_formats(strings):
        codes.append("MIXED_DATE_FORMATS")
    if cardinality == "CONSTANT":
        codes.append("CONSTANT_COLUMN")
    if null_percentage is not None and null_percentage >= 40:
        codes.append("HIGH_MISSINGNESS")
    if semantic_hint == "IDENTIFIER":
        codes.append("POTENTIAL_IDENTIFIER")
    if semantic_hint == "EMAIL":
        codes.append("EMAIL_SHAPED")
        invalid = [
            value
            for value in observed
            if isinstance(value, str) and value.strip() and not is_email_value(value)
        ]
        if invalid:
            codes.append("INVALID_EMAIL_FORMAT")
    if cardinality == "HIGH":
        codes.append("HIGH_CARDINALITY")
    del limits
    return codes


def observation_evidence(
    code: str,
    values: list[Any],
    *,
    limits: ProfileLimits,
) -> list[str]:
    observed = [value for value in values if not is_missing(value)]
    strings = [value for value in observed if isinstance(value, str)]
    samples: list[str] = []
    if code == "LEADING_TRAILING_WHITESPACE":
        samples = [
            display_value(item, max_chars=limits.value_display_chars)
            for item in strings
            if _has_padding(item)
        ]
    elif code == "CASE_VARIATION":
        samples = _case_variant_samples(strings, limits=limits)
    elif code == "POTENTIAL_MISSING_TOKENS":
        samples = [
            display_value(item, max_chars=limits.value_display_chars)
            for item in strings
            if item.strip().lower() in MISSING_TOKENS
        ]
    elif code == "MIXED_DATE_FORMATS":
        seen: set[str] = set()
        for item in strings:
            kind = _date_kind(item.strip())
            if kind and kind not in seen:
                seen.add(kind)
                samples.append(display_value(item, max_chars=limits.value_display_chars))
    elif code == "MIXED_TYPE_VALUES":
        numeric = [item for item in observed if coerce_number(item) is not None]
        other = [item for item in observed if coerce_number(item) is None]
        for group in (numeric, other):
            if group:
                samples.append(display_value(group[0], max_chars=limits.value_display_chars))
    elif code == "EMPTY_STRINGS":
        samples = [""]
    elif code == "INVALID_EMAIL_FORMAT":
        samples = [
            display_value(item, max_chars=limits.value_display_chars)
            for item in strings
            if item.strip() and not is_email_value(item)
        ]
    unique: list[str] = []
    seen_vals: set[str] = set()
    for sample in samples:
        if sample in seen_vals:
            continue
        seen_vals.add(sample)
        unique.append(sample)
        if len(unique) >= limits.evidence:
            break
    return unique


def _has_padding(value: str) -> bool:
    return value != "" and value != value.strip()


def _has_case_variants(strings: list[str]) -> bool:
    groups: dict[str, set[str]] = defaultdict(set)
    for item in strings:
        stripped = item.strip()
        if not stripped:
            continue
        groups[stripped.casefold()].add(stripped)
    return any(len(variants) > 1 for variants in groups.values())


def _case_variant_samples(strings: list[str], *, limits: ProfileLimits) -> list[str]:
    groups: dict[str, set[str]] = defaultdict(set)
    for item in strings:
        stripped = item.strip()
        if stripped:
            groups[stripped.casefold()].add(stripped)
    samples: list[str] = []
    for variants in groups.values():
        if len(variants) > 1:
            samples.extend(
                display_value(item, max_chars=limits.value_display_chars)
                for item in sorted(variants)
            )
    return samples


def _potential_missing_tokens(strings: list[str]) -> bool:
    return any(item.strip().lower() in MISSING_TOKENS for item in strings)


def _mixed_numeric_text(observed: list[Any]) -> bool:
    if len(observed) < 4:
        return False
    numeric = 0
    other = 0
    for item in observed:
        if isinstance(item, bool):
            other += 1
            continue
        if coerce_number(item) is not None:
            numeric += 1
        else:
            other += 1
    return numeric >= 2 and other >= 2


def _mixed_date_formats(strings: list[str]) -> bool:
    kinds: set[str] = set()
    dated = 0
    for item in strings:
        kind = _date_kind(item.strip())
        if kind:
            kinds.add(kind)
            dated += 1
    return dated >= 3 and len(kinds) >= 2


def _date_kind(text: str) -> str | None:
    if _ISO_DATE.match(text):
        return "iso"
    if _SLASH_DATE.match(text):
        return "slash"
    if _LONG_DATE.match(text) or _LONG_DATE_ALT.match(text):
        return "long"
    return None
