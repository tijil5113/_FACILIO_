"""Deterministic step order, conflict detection, and plan fingerprints."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from facilio_processing.transformations.catalog import get_operation
from facilio_processing.transformations.errors import UnsupportedTransformationError
from facilio_processing.workflows.types import ValidationIssue

OPERATION_ORDER: dict[str, int] = {
    "TRIM_WHITESPACE": 10,
    "REPLACE_VALUE": 15,
    "NORMALIZE_CASE": 20,
    "FILL_MISSING": 30,
    "CAST_TYPE": 40,
    "REMOVE_DUPLICATES": 50,
    "DROP_MISSING_ROWS": 60,
    "RENAME_COLUMN": 70,
    "DROP_COLUMN": 80,
}

_GUIDED_ALLOWLIST = frozenset(OPERATION_ORDER)


def canonical_parameters(parameters: dict[str, Any] | None) -> dict[str, Any]:
    return json.loads(json.dumps(parameters or {}, sort_keys=True, default=str))


def order_steps(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Stable deterministic order. Does not use UI render order."""

    def key(item: dict[str, Any]) -> tuple[int, str, str, str]:
        code = str(item.get("operation_code") or "")
        params = item.get("parameters") or {}
        column = str(params.get("column") or "")
        rec = str(item.get("recommendation_id") or item.get("id") or "")
        return (OPERATION_ORDER.get(code, 500), column, rec, code)

    ordered: list[dict[str, Any]] = []
    for position, item in enumerate(sorted(steps, key=key)):
        copy = dict(item)
        copy["position"] = position
        ordered.append(copy)
    return ordered


def plan_fingerprint(version_id: str, steps: list[dict[str, Any]]) -> str:
    payload = {
        "version_id": str(version_id),
        "steps": [
            {
                "operation_code": str(item.get("operation_code") or ""),
                "parameters": canonical_parameters(item.get("parameters")),
            }
            for item in order_steps(steps)
        ],
    }
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def detect_plan_conflicts(steps: list[dict[str, Any]]) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    seen_ops: dict[tuple[str, str], dict[str, Any]] = {}
    drop_columns: set[str] = set()
    fill_columns: set[str] = set()
    case_modes: dict[str, str] = {}

    for item in order_steps(steps):
        code = str(item.get("operation_code") or "").strip().upper()
        params = item.get("parameters") or {}
        column = params.get("column")
        rec = str(item.get("recommendation_id") or item.get("id") or "")
        if code not in _GUIDED_ALLOWLIST:
            try:
                get_operation(code)
            except UnsupportedTransformationError:
                issues.append(
                    ValidationIssue(
                        code="UNSUPPORTED_TRANSFORMATION",
                        message=f'"{code}" is not a registered cleanup operation.',
                        step_id=rec or None,
                        column=column if isinstance(column, str) else None,
                    )
                )
                continue
            issues.append(
                ValidationIssue(
                    code="CLEANUP_OPERATION_NOT_GUIDED",
                    message=(
                        f"{code} is available in manual Clean, not in Guided Cleanup."
                    ),
                    step_id=rec or None,
                )
            )
            continue

        if code == "DROP_COLUMN" and isinstance(column, str):
            drop_columns.add(column)
        if code == "FILL_MISSING" and isinstance(column, str):
            fill_columns.add(column)
        if code == "NORMALIZE_CASE" and isinstance(column, str):
            mode = str(params.get("mode") or "")
            previous = case_modes.get(column)
            if previous and previous != mode:
                issues.append(
                    ValidationIssue(
                        code="CLEANUP_CONFLICT",
                        message=(
                            f"FACILIO cannot make {column} both {previous} and {mode}. "
                            "Choose one capitalization."
                        ),
                        column=column,
                    )
                )
            case_modes[column] = mode
        if code == "DROP_MISSING_ROWS":
            columns = params.get("columns") or ([column] if column else [])
            for name in columns:
                if name in fill_columns:
                    issues.append(
                        ValidationIssue(
                            code="CLEANUP_CONFLICT",
                            message=(
                                f"FACILIO cannot fill missing values in {name} and also "
                                "drop those rows in the same cleanup."
                            ),
                            column=str(name),
                        )
                    )

        signature = (code, json.dumps(canonical_parameters(params), sort_keys=True))
        if signature in seen_ops:
            issues.append(
                ValidationIssue(
                    code="CLEANUP_DUPLICATE_STEP",
                    message="The same cleanup step was selected more than once.",
                    step_id=rec or None,
                    column=column if isinstance(column, str) else None,
                )
            )
        seen_ops[signature] = item

    for item in order_steps(steps):
        code = str(item.get("operation_code") or "")
        params = item.get("parameters") or {}
        column = params.get("column")
        if (
            code != "DROP_COLUMN"
            and isinstance(column, str)
            and column in drop_columns
        ):
            issues.append(
                ValidationIssue(
                    code="CLEANUP_CONFLICT",
                    message=(
                        f"FACILIO cannot drop {column} and also change values in it."
                    ),
                    column=column,
                )
            )
        if code == "DROP_MISSING_ROWS":
            columns = params.get("columns") or []
            for name in columns:
                if name in drop_columns:
                    issues.append(
                        ValidationIssue(
                            code="CLEANUP_CONFLICT",
                            message=(
                                f"FACILIO cannot drop {name} and also drop rows using it."
                            ),
                            column=str(name),
                        )
                    )
    return issues
