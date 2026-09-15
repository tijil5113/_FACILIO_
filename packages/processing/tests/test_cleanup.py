"""Deterministic guided-cleanup recommendation and plan tests."""

from __future__ import annotations

import pandas as pd

from facilio_processing.cleanup import (
    build_recommendations,
    detect_plan_conflicts,
    order_steps,
    plan_fingerprint,
)
from facilio_processing.workflows import WorkflowStepSpec, preview_pipeline


def _issues() -> list[dict]:
    return [
        {
            "id": "LEADING_TRAILING_WHITESPACE:customer_name",
            "code": "LEADING_TRAILING_WHITESPACE",
            "column": "customer_name",
            "affected_count": 6,
            "evidence": [" Alice "],
            "title": "Leading or trailing whitespace",
            "description": "Whitespace padding was observed in customer_name.",
        },
        {
            "id": "CASE_VARIATION:status",
            "code": "CASE_VARIATION",
            "column": "status",
            "affected_count": 3,
            "evidence": ["ACTIVE", "active", "Active"],
            "title": "Case variation",
            "description": "status varies.",
        },
        {
            "id": "MISSING_VALUES:lifetime_value",
            "code": "MISSING_VALUES",
            "column": "lifetime_value",
            "affected_count": 2,
            "evidence": [],
            "title": "Missing values",
            "description": "2 nulls",
        },
        {
            "id": "DUPLICATE_ROWS:*",
            "code": "DUPLICATE_ROWS",
            "column": None,
            "affected_count": 1,
            "evidence": ["rows 0, 2"],
            "title": "Duplicate rows",
            "description": "1 extra duplicate",
        },
        {
            "id": "HIGH_CARDINALITY:id",
            "code": "HIGH_CARDINALITY",
            "column": "id",
            "affected_count": 10,
            "evidence": [],
            "title": "High cardinality",
            "description": "Looks like an identifier.",
        },
    ]


def test_mappings_are_deterministic_and_version_specific() -> None:
    types = {
        "customer_name": "TEXT",
        "status": "TEXT",
        "lifetime_value": "DECIMAL",
        "id": "TEXT",
    }
    first = [item.to_dict() for item in build_recommendations(_issues(), column_types=types)]
    second = [item.to_dict() for item in build_recommendations(_issues(), column_types=types)]
    assert first == second
    by_code = {item["issue_code"]: item for item in first}
    assert by_code["LEADING_TRAILING_WHITESPACE"]["operation_code"] == "TRIM_WHITESPACE"
    assert by_code["LEADING_TRAILING_WHITESPACE"]["columns"] == ["customer_name"]
    assert by_code["LEADING_TRAILING_WHITESPACE"]["preselected"] is True
    assert by_code["CASE_VARIATION"]["operation_code"] == "NORMALIZE_CASE"
    assert by_code["CASE_VARIATION"]["default_parameters"]["mode"] == "lowercase"
    assert by_code["MISSING_VALUES"]["operation_code"] == "FILL_MISSING"
    assert by_code["MISSING_VALUES"]["default_parameters"]["strategy"] == "median"
    assert by_code["DUPLICATE_ROWS"]["operation_code"] == "REMOVE_DUPLICATES"
    assert by_code["DUPLICATE_ROWS"]["preselected"] is False
    assert by_code["HIGH_CARDINALITY"]["kind"] == "informational"
    assert by_code["HIGH_CARDINALITY"]["operation_code"] is None


def test_text_missing_requires_configuration() -> None:
    recs = build_recommendations(
        [
            {
                "id": "MISSING_VALUES:city",
                "code": "MISSING_VALUES",
                "column": "city",
                "affected_count": 2,
                "evidence": [],
            }
        ],
        column_types={"city": "TEXT"},
    )
    item = recs[0]
    assert item.kind == "actionable"
    assert item.required_user_configuration is True
    assert item.applicable is False
    assert item.preselected is False


def test_unsupported_issue_is_informational() -> None:
    recs = build_recommendations(
        [
            {
                "id": "MIXED_DATE_FORMATS:signup_date",
                "code": "MIXED_DATE_FORMATS",
                "column": "signup_date",
                "affected_count": 4,
                "evidence": ["2024-01-01", "01/02/2024"],
            }
        ]
    )
    assert recs[0].kind == "informational"
    assert "doesn't have a safe guided cleanup" in (recs[0].not_applicable_reason or "")


def test_order_trim_before_case() -> None:
    steps = [
        {
            "recommendation_id": "b",
            "operation_code": "NORMALIZE_CASE",
            "parameters": {"column": "status", "mode": "lowercase"},
        },
        {
            "recommendation_id": "a",
            "operation_code": "TRIM_WHITESPACE",
            "parameters": {"column": "customer_name"},
        },
    ]
    ordered = order_steps(steps)
    assert [item["operation_code"] for item in ordered] == [
        "TRIM_WHITESPACE",
        "NORMALIZE_CASE",
    ]


def test_conflict_lowercase_and_uppercase() -> None:
    issues = detect_plan_conflicts(
        [
            {
                "operation_code": "NORMALIZE_CASE",
                "parameters": {"column": "status", "mode": "lowercase"},
            },
            {
                "operation_code": "NORMALIZE_CASE",
                "parameters": {"column": "status", "mode": "uppercase"},
            },
        ]
    )
    assert any(item.code == "CLEANUP_CONFLICT" for item in issues)


def test_conflict_fill_and_drop_same_column() -> None:
    issues = detect_plan_conflicts(
        [
            {
                "operation_code": "FILL_MISSING",
                "parameters": {"column": "city", "strategy": "constant", "value": "n/a"},
            },
            {
                "operation_code": "DROP_MISSING_ROWS",
                "parameters": {"columns": ["city"]},
            },
        ]
    )
    assert any(item.code == "CLEANUP_CONFLICT" for item in issues)


def test_fingerprint_stable() -> None:
    steps = [
        {
            "operation_code": "TRIM_WHITESPACE",
            "parameters": {"column": "customer_name"},
        }
    ]
    first = plan_fingerprint("version-1", steps)
    second = plan_fingerprint("version-1", list(reversed(steps)))
    other = plan_fingerprint("version-2", steps)
    assert first == second
    assert first != other


def test_composed_preview_trim_then_lowercase() -> None:
    frame = pd.DataFrame({"name": [" Alice "]})
    steps = [
        WorkflowStepSpec("s1", 0, "TRIM_WHITESPACE", {"column": "name"}),
        WorkflowStepSpec("s2", 1, "NORMALIZE_CASE", {"column": "name", "mode": "lowercase"}),
    ]
    result, pipeline = preview_pipeline(frame, steps)
    assert result["name"].tolist() == ["alice"]
    assert pipeline.no_op is False
    assert " alice" not in result["name"].tolist()
