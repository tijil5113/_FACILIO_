"""Profiling engine tests. Source frames are never mutated."""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path

import pandas as pd

from facilio_processing.engine import get_engine_info, profile_dataset
from facilio_processing.profiling.inference import classify_cardinality, infer_profile_type
from facilio_processing.profiling.jsonutil import json_number
from facilio_processing.profiling.limits import PROFILE_VERSION, ProfileLimits
from facilio_processing.profiling.profiler import profile_frame
from helpers import write_csv


def test_engine_status_is_profiling() -> None:
    info = get_engine_info()
    assert info.status == "workflows"


def test_dataset_summary_missing_and_duplicates() -> None:
    frame = pd.DataFrame(
        {
            "name": ["Ada", "Bob", None],
            "city": ["Paris", "Lyon", "Lyon"],
        }
    )
    original = frame.copy(deep=True)
    profile = profile_frame(frame)
    assert profile.profile_version == PROFILE_VERSION
    assert profile.summary.row_count == 3
    assert profile.summary.column_count == 2
    assert profile.summary.total_cells == 6
    assert profile.summary.missing_cells == 1
    assert profile.summary.complete_cells == 5
    assert profile.summary.duplicate_rows == 0
    frame.iloc[2, 0] = "Ada"
    frame.iloc[2, 1] = "Paris"
    # still only one Ada/Paris after this mutation of the working frame
    frame.iloc[0, 0] = "Ada"
    frame.iloc[0, 1] = "Paris"
    frame.iloc[1, 0] = "Ada"
    frame.iloc[1, 1] = "Paris"
    profile = profile_frame(frame)
    assert profile.summary.duplicate_rows == 2
    assert profile.summary.unique_rows == 1
    assert original.iloc[0, 0] == "Ada"


def test_zero_row_dataset() -> None:
    frame = pd.DataFrame(columns=["a", "b"])
    profile = profile_frame(frame)
    assert profile.summary.row_count == 0
    assert profile.summary.total_cells == 0
    assert profile.summary.missing_percentage is None
    assert profile.summary.duplicate_percentage is None


def test_all_null_column() -> None:
    frame = pd.DataFrame({"empty": [None, None, None, None]})
    column = profile_frame(frame).columns[0]
    assert column.detected_type == "UNKNOWN"
    assert column.null_count == 4
    assert column.cardinality == "CONSTANT"


def test_text_profile_top_values_and_lengths() -> None:
    frame = pd.DataFrame(
        {"status": ["Active", "active", "Inactive", "ACTIVE", "Active", "active"]}
    )
    text = profile_frame(frame).columns[0].text
    assert text is not None
    assert text.min_length == 6
    assert text.max_length == 8
    assert text.top_values[0].value == "Active"
    assert text.top_values[0].count == 2
    assert len(text.top_values) <= 10


def test_top_values_are_bounded() -> None:
    values = [f"v{index}" for index in range(50)]
    frame = pd.DataFrame({"code": values})
    text = profile_frame(frame, limits=ProfileLimits(top_values=5)).columns[0].text
    assert text is not None
    assert len(text.top_values) == 5


def test_numeric_profile() -> None:
    frame = pd.DataFrame({"amount": [10, 20, 30, 40, 0, -5]})
    numeric = profile_frame(frame).columns[0].numeric
    assert numeric is not None
    assert numeric.minimum ==  -5
    assert numeric.maximum == 40
    assert numeric.mean == 15.833333
    assert numeric.median == 15.0
    assert numeric.zero_count == 1
    assert numeric.negative_count == 1
    assert numeric.percentile_25 is not None
    assert numeric.stddev is not None
    assert numeric.histogram is not None


def test_numeric_single_value_stddev_is_null() -> None:
    frame = pd.DataFrame({"n": [3]})
    numeric = profile_frame(frame).columns[0].numeric
    assert numeric is not None
    assert numeric.stddev is None
    assert numeric.histogram is None


def test_json_safe_statistics_reject_nan_inf() -> None:
    assert json_number(float("nan")) is None
    assert json_number(float("inf")) is None
    assert json_number(float("-inf")) is None
    frame = pd.DataFrame({"n": [1.0, float("inf"), 2.0]})
    numeric = profile_frame(frame).columns[0].numeric
    payload = json.dumps(profile_frame(frame).to_dict())
    assert "NaN" not in payload
    assert "Infinity" not in payload
    assert numeric is not None


def test_boolean_profile_does_not_treat_yes_no() -> None:
    yes_no = profile_frame(pd.DataFrame({"flag": ["yes", "no"]})).columns[0]
    assert yes_no.detected_type == "TEXT"
    flags = profile_frame(pd.DataFrame({"flag": ["true", "false", "true"]})).columns[0]
    assert flags.detected_type == "BOOLEAN"
    assert flags.boolean is not None
    assert flags.boolean.true_count == 2
    assert flags.boolean.false_count == 1


def test_date_profile_iso_only() -> None:
    frame = pd.DataFrame({"day": ["2024-01-12", "2024-03-03", "2024-05-18"]})
    column = profile_frame(frame).columns[0]
    assert column.detected_type == "DATE"
    assert column.date is not None
    assert column.date.minimum == "2024-01-12"
    assert column.date.maximum == "2024-05-18"


def test_mixed_date_stays_text() -> None:
    frame = pd.DataFrame(
        {"signup": ["2024-01-12", "12/02/2024", "March 4 2024", "2024-05-18"]}
    )
    column = profile_frame(frame).columns[0]
    assert column.detected_type == "TEXT"
    assert "MIXED_DATE_FORMATS" in column.observations


def test_empty_strings_distinct_from_null() -> None:
    frame = pd.DataFrame({"note": ["", None, "ok"]})
    column = profile_frame(frame).columns[0]
    assert column.null_count == 1
    assert column.empty_string_count == 1
    assert "EMPTY_STRINGS" in column.observations


def test_whitespace_and_case_variants() -> None:
    frame = pd.DataFrame({"city": ["London", " London", "london", "LONDON"]})
    column = profile_frame(frame).columns[0]
    assert "LEADING_TRAILING_WHITESPACE" in column.observations
    assert "CASE_VARIATION" in column.observations
    assert column.whitespace_count == 1


def test_potential_missing_tokens_not_reclassified() -> None:
    frame = pd.DataFrame({"city": ["Paris", "N/A", "Unknown"]})
    column = profile_frame(frame).columns[0]
    assert column.null_count == 0
    assert "POTENTIAL_MISSING_TOKENS" in column.observations
    assert column.potential_missing_token_count == 2


def test_email_semantic_hint() -> None:
    frame = pd.DataFrame(
        {
            "email": [
                "ada@example.test",
                "alan@example.test",
                "not-an-email",
            ]
        }
    )
    column = profile_frame(frame).columns[0]
    assert column.detected_type == "TEXT"
    assert column.semantic_hint == "EMAIL"
    assert column.invalid_email_count == 1
    assert "INVALID_EMAIL_FORMAT" in column.observations


def test_cardinality_rules() -> None:
    assert classify_cardinality(row_count=2, non_null_count=2, distinct_count=2) == "MEDIUM"
    assert classify_cardinality(row_count=5, non_null_count=5, distinct_count=1) == "CONSTANT"
    assert classify_cardinality(row_count=5, non_null_count=5, distinct_count=5) == "UNIQUE"
    assert (
        classify_cardinality(row_count=20, non_null_count=20, distinct_count=2) == "LOW"
    )
    assert (
        classify_cardinality(row_count=20, non_null_count=20, distinct_count=19)
        == "MEDIUM"
    )
    assert (
        classify_cardinality(row_count=50, non_null_count=50, distinct_count=48) == "HIGH"
    )


def test_type_inference_conservative() -> None:
    assert infer_profile_type(["2024-01-01", "hello"]) == "TEXT"
    assert infer_profile_type([1, 2, 3]) == "INTEGER"
    assert infer_profile_type(["1.5", "2.0"]) == "DECIMAL"
    assert infer_profile_type([True, False]) == "BOOLEAN"
    assert infer_profile_type([datetime(2024, 1, 1, 12, 0)]) == "DATETIME"
    assert infer_profile_type([date(2024, 1, 1)]) == "DATE"


def test_native_datetime_objects() -> None:
    frame = pd.DataFrame({"ts": [datetime(2024, 1, 1, 8, 0), datetime(2024, 1, 2, 9, 0)]})
    column = profile_frame(frame).columns[0]
    assert column.detected_type == "DATETIME"
    assert column.date is not None
    assert column.date.range_days is not None


def test_evidence_is_bounded() -> None:
    values = [f" Active{index % 3} " for index in range(40)]
    frame = pd.DataFrame({"label": values})
    profile = profile_frame(frame, limits=ProfileLimits(evidence=4))
    from facilio_processing.quality.engine import evaluate_quality

    quality = evaluate_quality(
        profile, {0: values}, limits=ProfileLimits(evidence=4)
    )
    whitespace = next(item for item in quality.issues if item.code == "LEADING_TRAILING_WHITESPACE")
    assert len(whitespace.evidence) <= 4


def test_customers_sample_detects_real_issues() -> None:
    sample = Path(__file__).resolve().parents[3] / "sample-data" / "customers.csv"
    profile, quality = profile_dataset(sample, "customers.csv")
    names = {column.name: column for column in profile.columns}
    assert profile.summary.row_count == 8
    assert profile.summary.missing_cells >= 3
    assert profile.summary.duplicate_rows >= 1
    assert names["status"].detected_type == "TEXT"
    assert "CASE_VARIATION" in names["status"].observations
    assert names["email"].semantic_hint == "EMAIL"
    assert names["lifetime_value"].detected_type in {"INTEGER", "DECIMAL"}
    codes = {issue.code for issue in quality.issues}
    assert "DUPLICATE_ROWS" in codes
    assert "MISSING_VALUES" in codes or "HIGH_MISSINGNESS" in codes
    assert "CASE_VARIATION" in codes
    assert "MIXED_DATE_FORMATS" in codes


def test_profile_does_not_mutate_source(tmp_path: Path) -> None:
    path = write_csv(tmp_path / "a.csv", "name\n Ada \nAda\n")
    before = path.read_bytes()
    profile_dataset(path, "a.csv")
    assert path.read_bytes() == before
