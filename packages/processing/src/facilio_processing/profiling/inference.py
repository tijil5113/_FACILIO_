"""Conservative physical type inference for profiling.

Rules (applied to non-null values only):

1. No non-null values → UNKNOWN.
2. All Python/numpy bools → BOOLEAN.
3. All strings in {true, false} (case-insensitive) and nothing else → BOOLEAN.
   yes/no/1/0 are not treated as booleans.
4. All values parse as integers (including integer-valued numeric strings) → INTEGER.
5. All values parse as finite numbers → DECIMAL.
6. All values are datetime/date objects, or all match ISO-8601 datetime → DATETIME
   when any time component is non-midnight; otherwise DATE.
7. All values match ISO-8601 calendar dates (YYYY-MM-DD) → DATE.
8. Otherwise → TEXT.

A single date-like string never promotes a column to DATE. Mixed date
representations stay TEXT so the quality engine can report them as observations.
"""

from __future__ import annotations

import math
import re
from datetime import date, datetime
from typing import Any

import pandas as pd

from facilio_processing.inference import is_missing
from facilio_processing.profiling.types import CardinalityClass, ProfileType, SemanticHint

_INT_RE = re.compile(r"^[+-]?\d+$")
_DEC_RE = re.compile(r"^[+-]?(?:\d+\.\d*|\.\d+)$")
_ISO_DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
_ISO_DT_RE = re.compile(
    r"^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$"
)
_EMAIL_RE = re.compile(r"^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$", re.IGNORECASE)
_BOOL_STRINGS = frozenset({"true", "false"})
_ID_NAMES = frozenset({"id", "uuid", "guid", "identifier", "pk", "key"})


def infer_profile_type(values: list[Any]) -> ProfileType:
    observed = [value for value in values if not is_missing(value)]
    if not observed:
        return "UNKNOWN"
    if all(isinstance(value, bool) for value in observed):
        return "BOOLEAN"
    if all(_is_bool_string(value) for value in observed):
        return "BOOLEAN"
    if all(_is_int_value(value) for value in observed):
        return "INTEGER"
    if all(_is_finite_number(value) for value in observed):
        return "DECIMAL"
    if all(_is_datetime_value(value) for value in observed):
        if all(_has_time_component(value) for value in observed):
            return "DATETIME"
        return "DATE"
    if all(_is_iso_datetime_string(value) for value in observed):
        return "DATETIME"
    if all(_is_iso_date_string(value) for value in observed):
        return "DATE"
    return "TEXT"


def classify_cardinality(
    *,
    row_count: int,
    non_null_count: int,
    distinct_count: int,
) -> CardinalityClass:
    """Deterministic cardinality labels.

    Small samples (row_count < 3) always return MEDIUM so CONSTANT/UNIQUE are
    not claimed from a handful of rows.

    - CONSTANT: row_count >= 3 and distinct_count <= 1
    - UNIQUE: row_count >= 5, no missing, distinct_count == row_count
    - HIGH: row_count >= 50 and distinct/non_null >= 0.90
    - LOW: row_count >= 10 and distinct/non_null <= 0.10, or distinct_count <= 8
      when row_count >= 20
    - MEDIUM: otherwise
    """
    if row_count < 3:
        return "MEDIUM"
    if distinct_count <= 1:
        return "CONSTANT"
    if row_count >= 5 and non_null_count == row_count and distinct_count == row_count:
        return "UNIQUE"
    if non_null_count <= 0:
        return "CONSTANT"
    ratio = distinct_count / non_null_count
    if row_count >= 50 and ratio >= 0.90:
        return "HIGH"
    if row_count >= 10 and ratio <= 0.10:
        return "LOW"
    if row_count >= 20 and distinct_count <= 8:
        return "LOW"
    return "MEDIUM"


def infer_semantic_hint(
    *,
    name: str,
    detected_type: ProfileType,
    values: list[Any],
    cardinality: CardinalityClass,
    non_null_count: int,
) -> SemanticHint | None:
    observed = [value for value in values if not is_missing(value)]
    lowered = name.strip().lower()
    if detected_type == "TEXT" and observed:
        matches = sum(1 for value in observed if is_email_value(value))
        ratio = matches / len(observed)
        named_email = "email" in lowered or lowered in {"e-mail", "mail"}
        if named_email and matches >= 1 and ratio >= 0.5:
            return "EMAIL"
        if ratio >= 0.95 and len(observed) >= 3:
            return "EMAIL"
    if cardinality in {"UNIQUE", "HIGH"} and non_null_count >= 5:
        if lowered in _ID_NAMES or lowered.endswith("_id"):
            if detected_type in {"TEXT", "INTEGER", "UNKNOWN"}:
                return "IDENTIFIER"
    return None


def is_email_value(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    text = value.strip()
    if not text or len(text) > 254:
        return False
    return _EMAIL_RE.match(text) is not None


def parse_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str) and value.strip().lower() in _BOOL_STRINGS:
        return value.strip().lower() == "true"
    return None


def coerce_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return float(value)
    if isinstance(value, float):
        if math.isfinite(value) and not pd.isna(value):
            return float(value)
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text or text.lower() in {"nan", "inf", "-inf", "+inf"}:
            return None
        try:
            number = float(text)
        except ValueError:
            return None
        if math.isfinite(number):
            return number
    return None


def coerce_int(value: Any) -> int | None:
    number = coerce_number(value)
    if number is None:
        return None
    if not float(number).is_integer():
        return None
    return int(number)


def parse_iso_datetime(value: Any) -> datetime | date | None:
    if isinstance(value, datetime) and not pd.isna(value):
        return value.replace(tzinfo=None) if value.tzinfo else value
    if isinstance(value, pd.Timestamp):
        if pd.isna(value):
            return None
        return value.to_pydatetime().replace(tzinfo=None)
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        text = value.strip()
        if _ISO_DT_RE.match(text):
            normalized = text.replace("Z", "+00:00")
            try:
                parsed = datetime.fromisoformat(normalized)
            except ValueError:
                return None
            return parsed.replace(tzinfo=None)
        if _ISO_DATE_RE.match(text):
            try:
                return date.fromisoformat(text)
            except ValueError:
                return None
    return None


def _is_bool_string(value: Any) -> bool:
    if isinstance(value, bool):
        return True
    return isinstance(value, str) and value.strip().lower() in _BOOL_STRINGS


def _is_int_value(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    if isinstance(value, float):
        return math.isfinite(value) and not pd.isna(value) and value.is_integer()
    if isinstance(value, str):
        return bool(_INT_RE.match(value.strip()))
    return False


def _is_finite_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    if isinstance(value, float):
        return not pd.isna(value)
    return coerce_number(value) is not None


def _is_datetime_value(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, pd.Timestamp):
        return not pd.isna(value)
    return isinstance(value, datetime | date)


def _has_time_component(value: Any) -> bool:
    parsed = parse_iso_datetime(value)
    if isinstance(parsed, datetime):
        return (parsed.hour, parsed.minute, parsed.second, parsed.microsecond) != (
            0,
            0,
            0,
            0,
        )
    return False


def _is_iso_date_string(value: Any) -> bool:
    return isinstance(value, str) and _ISO_DATE_RE.match(value.strip()) is not None


def _is_iso_datetime_string(value: Any) -> bool:
    return isinstance(value, str) and _ISO_DT_RE.match(value.strip()) is not None
