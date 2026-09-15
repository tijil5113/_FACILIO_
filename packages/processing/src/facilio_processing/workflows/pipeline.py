"""Multi-step preview and execution using the Phase 5 transformation engine."""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any

import pandas as pd

from facilio_processing.errors import ProcessingError
from facilio_processing.transformations.engine import apply_transformation
from facilio_processing.workflows.schema import schema_from_columns, validate_workflow
from facilio_processing.workflows.types import (
    PipelineResult,
    PipelineStepResult,
    WorkflowStepSpec,
    WorkflowValidation,
)


def enabled_steps(steps: list[WorkflowStepSpec]) -> list[WorkflowStepSpec]:
    return [item for item in sorted(steps, key=lambda step: step.position) if item.enabled]


def preview_pipeline(
    frame: pd.DataFrame,
    steps: list[WorkflowStepSpec],
    *,
    example_limit: int = 10,
) -> tuple[pd.DataFrame, PipelineResult]:
    """Run enabled steps in memory. Does not persist and does not mutate `frame`."""
    return _run_pipeline(frame, steps, example_limit=example_limit)


def execute_pipeline(
    frame: pd.DataFrame,
    steps: list[WorkflowStepSpec],
    *,
    example_limit: int = 10,
    on_step_start: Callable[[WorkflowStepSpec, int, int], None] | None = None,
    on_step_complete: Callable[[PipelineStepResult, int, int], None] | None = None,
    should_stop: Callable[[], bool] | None = None,
) -> tuple[pd.DataFrame, PipelineResult]:
    """Execute enabled steps in memory. Caller is responsible for persistence."""
    return _run_pipeline(
        frame,
        steps,
        example_limit=example_limit,
        on_step_start=on_step_start,
        on_step_complete=on_step_complete,
        should_stop=should_stop,
    )


def validate_against_frame(
    frame: pd.DataFrame,
    steps: list[WorkflowStepSpec],
) -> WorkflowValidation:
    from facilio_processing.inference import columns_from_frame

    columns = [
        {"name": item.name, "dtype": item.dtype} for item in columns_from_frame(frame)
    ]
    schema = schema_from_columns(columns)
    return validate_workflow(steps, input_schema=schema)


def _run_pipeline(
    frame: pd.DataFrame,
    steps: list[WorkflowStepSpec],
    *,
    example_limit: int,
    on_step_start: Callable[[WorkflowStepSpec, int, int], None] | None = None,
    on_step_complete: Callable[[PipelineStepResult, int, int], None] | None = None,
    should_stop: Callable[[], bool] | None = None,
) -> tuple[pd.DataFrame, PipelineResult]:
    original = frame
    current = frame
    rows_before = int(frame.shape[0])
    columns_before = int(frame.shape[1])
    results: list[PipelineStepResult] = []
    started = time.perf_counter()
    failed = False
    cancelled = False
    remaining = enabled_steps(steps)
    total = len(remaining)
    for index, step in enumerate(remaining):
        if failed:
            results.append(
                PipelineStepResult(
                    step_id=step.id,
                    position=step.position,
                    operation_code=step.operation_code,
                    parameters=dict(step.parameters or {}),
                    status="SKIPPED",
                    impact=None,
                    summary="Skipped because an earlier step failed.",
                )
            )
            continue
        if should_stop is not None and should_stop():
            cancelled = True
            for later in remaining[index:]:
                cancelled_step = PipelineStepResult(
                    step_id=later.id,
                    position=later.position,
                    operation_code=later.operation_code,
                    parameters=dict(later.parameters or {}),
                    status="CANCELLED",
                    impact=None,
                    summary="Not executed because cancellation was requested.",
                )
                results.append(cancelled_step)
                if on_step_complete is not None:
                    on_step_complete(cancelled_step, index, total)
            break
        if on_step_start is not None:
            on_step_start(step, index, total)
        step_started = time.perf_counter()
        try:
            result_frame, payload = apply_transformation(
                current,
                step.operation_code,
                step.parameters or {},
                example_limit=example_limit,
            )
        except ProcessingError as error:
            duration = _elapsed_ms(step_started)
            results.append(
                PipelineStepResult(
                    step_id=step.id,
                    position=step.position,
                    operation_code=step.operation_code,
                    parameters=dict(step.parameters or {}),
                    status="FAILED",
                    impact=None,
                    duration_ms=duration,
                    error_code=error.code,
                    error_message=error.message,
                    summary=error.message,
                )
            )
            failed = True
            if on_step_complete is not None:
                on_step_complete(results[-1], index, total)
            for later in remaining[index + 1 :]:
                skipped = PipelineStepResult(
                    step_id=later.id,
                    position=later.position,
                    operation_code=later.operation_code,
                    parameters=dict(later.parameters or {}),
                    status="SKIPPED",
                    impact=None,
                    summary="Skipped because an earlier step failed.",
                )
                results.append(skipped)
                if on_step_complete is not None:
                    on_step_complete(skipped, index, total)
            break
        duration = _elapsed_ms(step_started)
        warnings = tuple(payload.warnings)
        if payload.impact.no_op:
            warnings = warnings + ("NO CHANGES",)
        succeeded = PipelineStepResult(
            step_id=step.id,
            position=step.position,
            operation_code=payload.operation,
            parameters=dict(payload.parameters),
            status="SUCCEEDED",
            impact=payload.impact,
            examples=tuple(payload.examples),
            warnings=warnings,
            summary=payload.summary,
            duration_ms=duration,
        )
        results.append(succeeded)
        if on_step_complete is not None:
            on_step_complete(succeeded, index, total)
        current = result_frame

    duration_ms = _elapsed_ms(started)
    no_op = (
        (not failed)
        and (not cancelled)
        and all(
            item.status == "SUCCEEDED" and item.impact is not None and item.impact.no_op
            for item in results
        )
    )
    if not remaining:
        no_op = True
        current = original
    error_code = None
    error_message = None
    failed_step = next((item for item in results if item.status == "FAILED"), None)
    if failed_step is not None:
        error_code = failed_step.error_code
        error_message = failed_step.error_message
    elif cancelled:
        error_code = "JOB_CANCELLED"
        error_message = "Execution stopped after cancellation was requested."
    result = PipelineResult(
        steps=tuple(results),
        failed=failed,
        no_op=no_op,
        rows_before=rows_before,
        rows_after=int(current.shape[0]),
        columns_before=columns_before,
        columns_after=int(current.shape[1]),
        duration_ms=duration_ms,
        error_code=error_code,
        error_message=error_message,
        cancelled=cancelled,
    )
    return current, result


def _elapsed_ms(started: float) -> int:
    return max(0, int(round((time.perf_counter() - started) * 1000)))


def snapshot_steps(steps: list[WorkflowStepSpec]) -> list[dict[str, Any]]:
    enabled = enabled_steps(steps)
    return [
        {
            "id": item.id,
            "position": item.position,
            "operation_code": item.operation_code,
            "parameters": dict(item.parameters or {}),
            "enabled": True,
        }
        for item in enabled
    ]
