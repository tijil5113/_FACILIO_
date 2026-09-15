"""Quality engine tests with exact, documented scores."""

from __future__ import annotations

import pandas as pd

from facilio_processing.profiling.profiler import profile_frame
from facilio_processing.quality.engine import evaluate_quality
from facilio_processing.quality.scoring import grade_for, overall_from_scores


def _quality(frame: pd.DataFrame):
    profile = profile_frame(frame)
    values = {index: frame.iloc[:, index].tolist() for index in range(frame.shape[1])}
    return profile, evaluate_quality(profile, values)


def test_perfect_completeness_and_uniqueness() -> None:
    frame = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
    _profile, quality = _quality(frame)
    completeness = next(item for item in quality.dimensions if item.key == "COMPLETENESS")
    uniqueness = next(item for item in quality.dimensions if item.key == "UNIQUENESS")
    assert completeness.status == "ASSESSED"
    assert completeness.score == 100.0
    assert uniqueness.score == 100.0


def test_missing_data_completeness_formula() -> None:
    frame = pd.DataFrame({"a": [1, None, 3], "b": [1, 2, 3]})
    profile, quality = _quality(frame)
    completeness = next(item for item in quality.dimensions if item.key == "COMPLETENESS")
    assert profile.summary.total_cells == 6
    assert profile.summary.missing_cells == 1
    assert completeness.score == 83.3
    assert "1 of 6 cells are missing" in completeness.explanation


def test_duplicate_uniqueness_formula() -> None:
    frame = pd.DataFrame({"a": [1, 1, 2], "b": ["x", "x", "y"]})
    profile, quality = _quality(frame)
    uniqueness = next(item for item in quality.dimensions if item.key == "UNIQUENESS")
    assert profile.summary.duplicate_rows == 1
    assert profile.summary.unique_rows == 2
    assert uniqueness.score == 66.7


def test_integrity_is_not_assessed() -> None:
    frame = pd.DataFrame({"a": [1, 2]})
    _profile, quality = _quality(frame)
    integrity = next(item for item in quality.dimensions if item.key == "INTEGRITY")
    assert integrity.status == "NOT_ASSESSED"
    assert integrity.score is None


def test_validity_not_assessed_without_contracts() -> None:
    frame = pd.DataFrame({"label": ["alpha", "beta", "gamma"]})
    _profile, quality = _quality(frame)
    validity = next(item for item in quality.dimensions if item.key == "VALIDITY")
    assert validity.status == "NOT_ASSESSED"
    assert validity.score is None


def test_validity_email_contract() -> None:
    frame = pd.DataFrame(
        {
            "email": [
                "a@example.test",
                "b@example.test",
                "not-valid",
                "c@example.test",
            ]
        }
    )
    _profile, quality = _quality(frame)
    validity = next(item for item in quality.dimensions if item.key == "VALIDITY")
    assert validity.status == "ASSESSED"
    assert validity.score == 75.0


def test_consistency_case_variation_penalty() -> None:
    frame = pd.DataFrame({"status": ["Active", "active", "ACTIVE", "Active"]})
    _profile, quality = _quality(frame)
    consistency = next(item for item in quality.dimensions if item.key == "CONSISTENCY")
    assert consistency.status == "ASSESSED"
    assert consistency.score == 85.0


def test_overall_excludes_not_assessed() -> None:
    score, status = overall_from_scores([100.0, 80.0])
    assert status == "ASSESSED"
    assert score == 90.0
    empty_score, empty_status = overall_from_scores([])
    assert empty_status == "NOT_ASSESSED"
    assert empty_score is None


def test_overall_not_assessed_when_zero_cells() -> None:
    frame = pd.DataFrame(columns=["a"])
    _profile, quality = _quality(frame)
    assert quality.overall_status == "NOT_ASSESSED"
    assert quality.overall_score is None
    assert quality.grade is None


def test_quality_labels() -> None:
    assert grade_for(90.0, "ASSESSED") == "Excellent"
    assert grade_for(80.0, "ASSESSED") == "Good"
    assert grade_for(70.0, "ASSESSED") == "Fair"
    assert grade_for(60.0, "ASSESSED") == "Needs attention"
    assert grade_for(59.9, "ASSESSED") == "Poor"
    assert grade_for(100.0, "NOT_ASSESSED") is None


def test_issue_severity_is_restrained() -> None:
    frame = pd.DataFrame({"status": ["Active", "active"]})
    _profile, quality = _quality(frame)
    case = next(item for item in quality.issues if item.code == "CASE_VARIATION")
    assert case.severity == "INFO"


def test_single_row_uniqueness() -> None:
    frame = pd.DataFrame({"a": [1]})
    _profile, quality = _quality(frame)
    uniqueness = next(item for item in quality.dimensions if item.key == "UNIQUENESS")
    assert uniqueness.score == 100.0


def test_determinism() -> None:
    frame = pd.DataFrame(
        {"email": ["ada@example.test", "alan@example.test"], "n": [1, 2]}
    )
    first = evaluate_quality(profile_frame(frame), {0: frame["email"].tolist(), 1: frame["n"].tolist()})
    second = evaluate_quality(profile_frame(frame), {0: frame["email"].tolist(), 1: frame["n"].tolist()})
    assert first.to_dict() == second.to_dict()
