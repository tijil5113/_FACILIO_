"""Bounded profiling limits. Phase 4 loads the full uploaded file in memory."""

from __future__ import annotations

from dataclasses import dataclass

PROFILE_VERSION = "1.0"

DEFAULT_TOP_VALUES_LIMIT = 10
DEFAULT_EVIDENCE_LIMIT = 8
DEFAULT_HISTOGRAM_BINS = 10
DEFAULT_DUPLICATE_GROUPS_LIMIT = 5
DEFAULT_VALUE_DISPLAY_CHARS = 120


@dataclass(frozen=True, slots=True)
class ProfileLimits:
    top_values: int = DEFAULT_TOP_VALUES_LIMIT
    evidence: int = DEFAULT_EVIDENCE_LIMIT
    histogram_bins: int = DEFAULT_HISTOGRAM_BINS
    duplicate_groups: int = DEFAULT_DUPLICATE_GROUPS_LIMIT
    value_display_chars: int = DEFAULT_VALUE_DISPLAY_CHARS
