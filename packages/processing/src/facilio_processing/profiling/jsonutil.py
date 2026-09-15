"""JSON-safe numeric and evidence helpers. Never emit NaN or Infinity."""

from __future__ import annotations

import math
from typing import Any

import pandas as pd

from facilio_processing.inference import is_missing
from facilio_processing.serialization import json_safe


def json_number(value: Any) -> float | int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int) and not isinstance(value, bool):
        return int(value)
    try:
        if is_missing(value):
            return None
    except (TypeError, ValueError):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    if not math.isfinite(number):
        return None
    if number.is_integer() and isinstance(value, int):
        return int(value)
    return float(number)


def round_float(value: float | None, digits: int = 6) -> float | None:
    if value is None:
        return None
    if not math.isfinite(value):
        return None
    return round(value, digits)


def round_score(value: float | None) -> float | None:
    if value is None:
        return None
    if not math.isfinite(value):
        return None
    return round(max(0.0, min(100.0, value)), 1)


def percentage(part: int, whole: int, *, digits: int = 4) -> float | None:
    if whole <= 0:
        return None
    return round((part / whole) * 100.0, digits)


def display_value(value: Any, *, max_chars: int) -> str:
    if is_missing(value):
        return ""
    rendered = json_safe(value)
    if isinstance(rendered, str):
        text = rendered
    elif rendered is None:
        text = ""
    else:
        text = str(rendered)
    if len(text) > max_chars:
        return text[: max_chars - 1] + "…"
    return text


def canonical_key(value: Any) -> tuple[str, Any]:
    """Hashable row-cell identity that does not mutate the source value."""
    if is_missing(value):
        return ("null", None)
    if isinstance(value, bool):
        return ("bool", value)
    if isinstance(value, int) and not isinstance(value, bool):
        return ("int", int(value))
    if isinstance(value, float):
        if pd.isna(value) or not math.isfinite(value):
            return ("null", None)
        return ("float", float(value))
    if isinstance(value, str):
        return ("str", value)
    safe = json_safe(value)
    if isinstance(safe, list | dict):
        return ("json", repr(safe))
    return ("other", safe)
