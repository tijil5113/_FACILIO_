"""Transformation engine tests. Input frames must remain unchanged."""

from __future__ import annotations

import pandas as pd
import pytest

from facilio_processing.transformations import (
    apply_transformation,
    catalog,
    preview_transformation,
)
from facilio_processing.transformations.errors import (
    CastFailedError,
    ColumnNameConflictError,
    ColumnNotFoundError,
    LastColumnCannotBeDroppedError,
    NoNumericValuesError,
    UnsupportedTransformationError,
)


def _frame() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "name": [" Alice Johnson ", "  Kate Martin", "Ada", None],
            "status": ["ACTIVE", "Active", "active", "ACTIVE"],
            "city": ["Paris", "Paris", "", None],
            "value": [10.0, None, 30.0, 50.0],
        }
    )


def test_catalog_contains_required_operations() -> None:
    codes = {item["code"] for item in catalog()}
    assert {
        "TRIM_WHITESPACE",
        "NORMALIZE_CASE",
        "REPLACE_VALUE",
        "FILL_MISSING",
        "DROP_MISSING_ROWS",
        "REMOVE_DUPLICATES",
        "RENAME_COLUMN",
        "DROP_COLUMN",
        "CAST_TYPE",
    } <= codes


def test_trim_whitespace_counts_only_changes() -> None:
    frame = _frame()
    snapshot = frame.copy(deep=True)
    result, preview = preview_transformation(
        frame, "TRIM_WHITESPACE", {"column": "name"}
    )
    assert frame.equals(snapshot)
    assert preview.impact.changed_cell_count == 2
    assert result.loc[0, "name"] == "Alice Johnson"
    assert result.loc[2, "name"] == "Ada"
    assert result.loc[3, "name"] is None
    assert preview.examples[0].before == " Alice Johnson "


def test_trim_preserves_numbers_and_empty_string() -> None:
    frame = pd.DataFrame({"mixed": [" x ", 3, True, "", None]})
    result, preview = apply_transformation(frame, "TRIM_WHITESPACE", {"column": "mixed"})
    assert result.loc[1, "mixed"] == 3
    assert result.loc[2, "mixed"] is True
    assert result.loc[3, "mixed"] == ""
    assert preview.impact.changed_cell_count == 1


def test_case_modes_and_no_false_changes() -> None:
    frame = pd.DataFrame({"status": ["ACTIVE", "active", None, 1]})
    _, lower = preview_transformation(
        frame, "NORMALIZE_CASE", {"column": "status", "mode": "lowercase"}
    )
    assert lower.impact.changed_cell_count == 1
    _, upper = preview_transformation(
        frame, "NORMALIZE_CASE", {"column": "status", "mode": "uppercase"}
    )
    assert upper.impact.changed_cell_count == 1
    result, title = preview_transformation(
        frame, "NORMALIZE_CASE", {"column": "status", "mode": "title"}
    )
    assert result.loc[0, "status"] == "Active"
    assert title.impact.no_op is False


def test_exact_replace_is_case_sensitive() -> None:
    frame = pd.DataFrame({"status": ["Active", "active"]})
    _, preview = preview_transformation(
        frame,
        "REPLACE_VALUE",
        {"column": "status", "find": "Active", "replacement": "ok"},
    )
    assert preview.impact.changed_cell_count == 1
    _, none_changed = preview_transformation(
        frame,
        "REPLACE_VALUE",
        {"column": "status", "find": " ACTIVE ", "replacement": "ok"},
    )
    assert none_changed.impact.no_op is True


def test_fill_constant_does_not_fill_empty_strings() -> None:
    frame = pd.DataFrame({"city": ["Paris", "", None]})
    result, preview = apply_transformation(
        frame,
        "FILL_MISSING",
        {"column": "city", "strategy": "constant", "value": "Unknown"},
    )
    assert result.loc[1, "city"] == ""
    assert result.loc[2, "city"] == "Unknown"
    assert preview.impact.changed_cell_count == 1


def test_numeric_mean_and_median() -> None:
    frame = pd.DataFrame({"value": [10.0, None, 30.0]})
    _, mean_preview = preview_transformation(
        frame, "FILL_MISSING", {"column": "value", "strategy": "mean"}
    )
    assert mean_preview.extra["replacement_value"] == 20.0
    _, median_preview = preview_transformation(
        frame, "FILL_MISSING", {"column": "value", "strategy": "median"}
    )
    assert median_preview.extra["replacement_value"] == 20.0
    strings = pd.DataFrame({"value": ["10", None, "30"]})
    result, string_preview = preview_transformation(
        strings, "FILL_MISSING", {"column": "value", "strategy": "median"}
    )
    assert string_preview.extra["replacement_value"] == 20.0
    assert result.loc[1, "value"] == 20.0
    empty = pd.DataFrame({"value": [None, None]})
    with pytest.raises(NoNumericValuesError):
        preview_transformation(
            empty, "FILL_MISSING", {"column": "value", "strategy": "median"}
        )


def test_drop_missing_any_and_all() -> None:
    frame = pd.DataFrame({"a": [1, None, None], "b": [2, 3, None]})
    _, any_preview = preview_transformation(
        frame, "DROP_MISSING_ROWS", {"columns": ["a", "b"], "how": "any"}
    )
    assert any_preview.impact.removed_row_count == 2
    _, all_preview = preview_transformation(
        frame, "DROP_MISSING_ROWS", {"columns": ["a", "b"], "how": "all"}
    )
    assert all_preview.impact.removed_row_count == 1


def test_remove_duplicates_keeps_first() -> None:
    frame = pd.DataFrame({"name": ["Ada", "Ada", "Bob"], "n": [1, 1, 2]})
    result, preview = apply_transformation(frame, "REMOVE_DUPLICATES", {})
    assert list(result["name"]) == ["Ada", "Bob"]
    assert preview.impact.removed_row_count == 1
    assert preview.examples[0].row_index == 1


def test_rename_and_collision() -> None:
    frame = pd.DataFrame({"a": [1], "b": [2]})
    result, preview = apply_transformation(
        frame, "RENAME_COLUMN", {"column": "a", "new_name": "alpha"}
    )
    assert list(result.columns) == ["alpha", "b"]
    assert preview.impact.no_op is False
    with pytest.raises(ColumnNameConflictError):
        apply_transformation(frame, "RENAME_COLUMN", {"column": "a", "new_name": "b"})
    with pytest.raises(Exception):
        apply_transformation(frame, "RENAME_COLUMN", {"column": "a", "new_name": "  "})


def test_drop_column_and_last_column_guard() -> None:
    frame = pd.DataFrame({"a": [1], "b": [2]})
    result, preview = apply_transformation(frame, "DROP_COLUMN", {"column": "b"})
    assert list(result.columns) == ["a"]
    assert preview.impact.removed_column_count == 1
    with pytest.raises(LastColumnCannotBeDroppedError):
        apply_transformation(result, "DROP_COLUMN", {"column": "a"})


def test_cast_integer_and_failure() -> None:
    good = pd.DataFrame({"n": ["1", "2", None]})
    result, preview = apply_transformation(
        good, "CAST_TYPE", {"column": "n", "target_type": "INTEGER"}
    )
    assert result.loc[0, "n"] == 1
    assert result.loc[2, "n"] is None
    assert preview.impact.changed_cell_count == 2
    bad = pd.DataFrame({"n": ["1", "abc"]})
    with pytest.raises(CastFailedError) as error:
        apply_transformation(bad, "CAST_TYPE", {"column": "n", "target_type": "INTEGER"})
    assert error.value.details["incompatible_count"] == 1


def test_missing_column_and_unknown_operation() -> None:
    frame = _frame()
    with pytest.raises(ColumnNotFoundError):
        preview_transformation(frame, "TRIM_WHITESPACE", {"column": "nope"})
    with pytest.raises(UnsupportedTransformationError):
        preview_transformation(frame, "EVAL_PYTHON", {})


def test_preview_bounds_and_determinism() -> None:
    frame = pd.DataFrame({"name": [f" {index} " for index in range(20)]})
    _, first = preview_transformation(
        frame, "TRIM_WHITESPACE", {"column": "name"}, example_limit=10
    )
    _, second = preview_transformation(
        frame, "TRIM_WHITESPACE", {"column": "name"}, example_limit=10
    )
    assert len(first.examples) == 10
    assert first == second


def test_high_impact_warning() -> None:
    frame = pd.DataFrame({"a": [1, None, None, None]})
    _, preview = preview_transformation(
        frame, "DROP_MISSING_ROWS", {"columns": ["a"], "how": "any"}
    )
    assert any("75%" in item for item in preview.warnings)


def test_noop_already_trimmed() -> None:
    frame = pd.DataFrame({"name": ["Ada", "Bob"]})
    _, preview = preview_transformation(frame, "TRIM_WHITESPACE", {"column": "name"})
    assert preview.impact.no_op is True
    assert preview.impact.changed_cell_count == 0
