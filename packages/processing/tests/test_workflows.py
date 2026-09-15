"""Workflow validation, preview, and sequential execution tests."""

from __future__ import annotations

import pandas as pd

from facilio_processing.workflows import (
    WorkflowStepSpec,
    analyze_compatibility,
    derive_input_contract,
    execute_pipeline,
    preview_pipeline,
    schema_from_columns,
    snapshot_steps,
    validate_workflow,
)


def _customers() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "customer_name": [" Alice Johnson ", "Kate Martin", " Alice Johnson "],
            "status": ["ACTIVE", "active", "ACTIVE"],
            "lifetime_value": [120.0, None, 120.0],
            "city": ["Paris", "Lyon", "Paris"],
        }
    )


def _steps() -> list[WorkflowStepSpec]:
    return [
        WorkflowStepSpec("s1", 0, "TRIM_WHITESPACE", {"column": "customer_name"}),
        WorkflowStepSpec(
            "s2", 1, "NORMALIZE_CASE", {"column": "status", "mode": "lowercase"}
        ),
        WorkflowStepSpec(
            "s3", 2, "FILL_MISSING", {"column": "lifetime_value", "strategy": "median"}
        ),
        WorkflowStepSpec("s4", 3, "REMOVE_DUPLICATES", {"columns": None}),
    ]


def test_execute_pipeline_honors_cooperative_cancel() -> None:
    frame = _customers()
    calls: list[str] = []

    def should_stop() -> bool:
        return "s1" in calls

    def on_complete(result, index: int, total: int) -> None:
        calls.append(result.step_id)

    _result_frame, pipeline = execute_pipeline(
        frame,
        _steps(),
        on_step_complete=on_complete,
        should_stop=should_stop,
    )
    assert pipeline.cancelled is True
    assert [item.status for item in pipeline.steps] == [
        "SUCCEEDED",
        "CANCELLED",
        "CANCELLED",
        "CANCELLED",
    ]


def test_empty_and_disabled_workflow() -> None:
    result = validate_workflow([])
    assert result.empty is True
    assert result.valid is False
    disabled = validate_workflow(
        [WorkflowStepSpec("s1", 0, "TRIM_WHITESPACE", {"column": "x"}, enabled=False)]
    )
    assert disabled.empty is True


def test_invalid_operation() -> None:
    result = validate_workflow(
        [WorkflowStepSpec("s1", 0, "NOT_A_REAL_OP", {})]
    )
    assert result.valid is False
    assert any(item.code == "UNSUPPORTED_TRANSFORMATION" for item in result.issues)


def test_invalid_parameters() -> None:
    result = validate_workflow(
        [WorkflowStepSpec("s1", 0, "TRIM_WHITESPACE", {})]
    )
    assert result.valid is False
    assert any(item.field == "column" for item in result.issues)


def test_rename_then_old_name_is_invalid() -> None:
    schema = schema_from_columns(
        [{"name": "email", "dtype": "text"}, {"name": "status", "dtype": "text"}]
    )
    result = validate_workflow(
        [
            WorkflowStepSpec(
                "s1",
                0,
                "RENAME_COLUMN",
                {"column": "email", "new_name": "customer_email"},
            ),
            WorkflowStepSpec("s2", 1, "TRIM_WHITESPACE", {"column": "email"}),
        ],
        input_schema=schema,
    )
    assert result.valid is False
    assert any(item.column == "email" for item in result.issues)


def test_rename_then_new_name_is_valid() -> None:
    schema = schema_from_columns(
        [{"name": "email", "dtype": "text"}, {"name": "status", "dtype": "text"}]
    )
    result = validate_workflow(
        [
            WorkflowStepSpec(
                "s1",
                0,
                "RENAME_COLUMN",
                {"column": "email", "new_name": "customer_email"},
            ),
            WorkflowStepSpec("s2", 1, "TRIM_WHITESPACE", {"column": "customer_email"}),
        ],
        input_schema=schema,
    )
    assert result.valid is True


def test_drop_then_reference_is_invalid() -> None:
    schema = schema_from_columns(
        [{"name": "email", "dtype": "text"}, {"name": "status", "dtype": "text"}]
    )
    result = validate_workflow(
        [
            WorkflowStepSpec("s1", 0, "DROP_COLUMN", {"column": "email"}),
            WorkflowStepSpec("s2", 1, "TRIM_WHITESPACE", {"column": "email"}),
        ],
        input_schema=schema,
    )
    assert result.valid is False


def test_cast_then_numeric_fill_is_valid() -> None:
    schema = schema_from_columns(
        [{"name": "amount", "dtype": "text"}, {"name": "keep", "dtype": "text"}]
    )
    result = validate_workflow(
        [
            WorkflowStepSpec(
                "s1", 0, "CAST_TYPE", {"column": "amount", "target_type": "DECIMAL"}
            ),
            WorkflowStepSpec(
                "s2", 1, "FILL_MISSING", {"column": "amount", "strategy": "median"}
            ),
        ],
        input_schema=schema,
    )
    assert result.valid is True


def test_disabled_invalid_step_is_ignored() -> None:
    schema = schema_from_columns([{"name": "status", "dtype": "text"}])
    result = validate_workflow(
        [
            WorkflowStepSpec("s1", 0, "TRIM_WHITESPACE", {"column": "status"}),
            WorkflowStepSpec(
                "s2", 1, "TRIM_WHITESPACE", {"column": "missing"}, enabled=False
            ),
        ],
        input_schema=schema,
    )
    assert result.valid is True


def test_duplicate_positions() -> None:
    result = validate_workflow(
        [
            WorkflowStepSpec("s1", 0, "TRIM_WHITESPACE", {"column": "a"}),
            WorkflowStepSpec("s2", 0, "TRIM_WHITESPACE", {"column": "b"}),
        ]
    )
    assert any(item.code == "WORKFLOW_REORDER_INVALID" for item in result.issues)


def test_compatibility_missing_and_type() -> None:
    schema = schema_from_columns(
        [
            {"name": "customer_name", "dtype": "text"},
            {"name": "lifetime_value", "dtype": "boolean"},
        ]
    )
    contract = derive_input_contract(_steps())
    names = {item.name for item in contract.columns}
    assert "status" in names
    compatibility = analyze_compatibility(schema, contract)
    assert compatibility.status == "INCOMPATIBLE"
    messages = " ".join(item.message for item in compatibility.reasons)
    assert "status" in messages


def test_preview_does_not_mutate_and_reports_steps() -> None:
    frame = _customers()
    snapshot = frame.copy(deep=True)
    result_frame, preview = preview_pipeline(frame, _steps())
    assert frame.equals(snapshot)
    assert preview.failed is False
    assert preview.no_op is False
    assert preview.rows_before == 3
    assert preview.rows_after == 2
    assert result_frame.shape[0] == 2
    assert [item.status for item in preview.steps] == ["SUCCEEDED"] * 4
    assert preview.steps[0].impact is not None
    assert preview.steps[0].impact.changed_cell_count == 2


def test_noop_step_and_entire_pipeline() -> None:
    frame = pd.DataFrame({"name": ["Ada"], "status": ["active"]})
    _, preview = preview_pipeline(
        frame,
        [
            WorkflowStepSpec(
                "s1", 0, "NORMALIZE_CASE", {"column": "status", "mode": "lowercase"}
            ),
            WorkflowStepSpec(
                "s2", 1, "NORMALIZE_CASE", {"column": "status", "mode": "lowercase"}
            ),
        ],
    )
    assert preview.steps[0].impact is not None
    assert preview.steps[0].impact.no_op is True
    assert preview.steps[1].impact is not None
    assert preview.steps[1].impact.no_op is True
    assert "NO CHANGES" in preview.steps[1].warnings
    assert preview.no_op is True


def test_failure_skips_later_steps() -> None:
    frame = pd.DataFrame({"amount": ["x", "y"], "keep": ["a", "b"]})
    _, result = execute_pipeline(
        frame,
        [
            WorkflowStepSpec("s1", 0, "TRIM_WHITESPACE", {"column": "keep"}),
            WorkflowStepSpec(
                "s2", 1, "CAST_TYPE", {"column": "amount", "target_type": "INTEGER"}
            ),
            WorkflowStepSpec("s3", 2, "DROP_COLUMN", {"column": "keep"}),
        ],
    )
    assert result.failed is True
    assert [item.status for item in result.steps] == ["SUCCEEDED", "FAILED", "SKIPPED"]
    assert result.error_code == "CAST_FAILED"


def test_snapshot_contains_enabled_steps_only() -> None:
    steps = _steps()
    steps[2] = WorkflowStepSpec(
        "s3", 2, "FILL_MISSING", {"column": "lifetime_value", "strategy": "median"}, False
    )
    snap = snapshot_steps(steps)
    assert len(snap) == 3
    assert all(item["enabled"] for item in snap)
