"""Sequential schema validation and input-contract derivation."""

from __future__ import annotations

from typing import Any

from facilio_processing.transformations.catalog import get_operation
from facilio_processing.transformations.errors import UnsupportedTransformationError
from facilio_processing.workflows.types import (
    MAX_ENABLED_STEPS,
    CompatibilityResult,
    ContractColumn,
    InputContract,
    SchemaColumn,
    StepValidation,
    ValidationIssue,
    WorkflowStepSpec,
    WorkflowValidation,
)

NUMERIC_DTYPES = frozenset({"INTEGER", "DECIMAL", "TEXT", "UNKNOWN"})
ALL_DTYPES = frozenset(
    {"TEXT", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "UNKNOWN"}
)


def normalize_dtype(value: str | None) -> str:
    key = (value or "UNKNOWN").strip().upper()
    if key == "DATE":
        return "DATE"
    return key if key in ALL_DTYPES else "UNKNOWN"


def schema_from_columns(columns: list[dict[str, Any]] | None) -> list[SchemaColumn]:
    result: list[SchemaColumn] = []
    for item in columns or []:
        name = str(item.get("name") or "")
        dtype = normalize_dtype(str(item.get("dtype") or "unknown"))
        result.append(SchemaColumn(name=name, dtype=dtype))
    return result


def validate_workflow(
    steps: list[WorkflowStepSpec],
    *,
    input_schema: list[SchemaColumn] | None = None,
) -> WorkflowValidation:
    ordered = sorted(steps, key=lambda item: item.position)
    issues: list[ValidationIssue] = []
    issues.extend(_position_issues(ordered))
    enabled = [item for item in ordered if item.enabled]
    empty = len(enabled) == 0
    if empty:
        issues.append(
            ValidationIssue(
                code="WORKFLOW_EMPTY",
                message="The workflow has no enabled steps.",
            )
        )
    if len(enabled) > MAX_ENABLED_STEPS:
        issues.append(
            ValidationIssue(
                code="WORKFLOW_STEP_LIMIT",
                message=f"A workflow may include at most {MAX_ENABLED_STEPS} enabled steps.",
                details={"limit": MAX_ENABLED_STEPS, "count": len(enabled)},
            )
        )

    schema = list(input_schema or [])
    step_results: list[StepValidation] = []
    for step in ordered:
        before = tuple(schema)
        step_issues: list[ValidationIssue] = []
        after = schema
        if not step.enabled:
            step_results.append(
                StepValidation(
                    step_id=step.id,
                    position=step.position,
                    operation_code=step.operation_code,
                    enabled=False,
                    valid=True,
                    schema_before=before,
                    schema_after=before,
                    issues=(),
                )
            )
            continue
        try:
            definition = get_operation(step.operation_code)
        except UnsupportedTransformationError:
            step_issues.append(
                ValidationIssue(
                    code="UNSUPPORTED_TRANSFORMATION",
                    message=f'Transformation "{step.operation_code}" is not supported.',
                    step_id=step.id,
                    position=step.position,
                    details={"operation": step.operation_code},
                )
            )
            step_results.append(
                StepValidation(
                    step_id=step.id,
                    position=step.position,
                    operation_code=step.operation_code,
                    enabled=True,
                    valid=False,
                    schema_before=before,
                    schema_after=before,
                    issues=tuple(step_issues),
                )
            )
            issues.extend(step_issues)
            continue
        step_issues.extend(_parameter_issues(step, definition))
        if input_schema is not None:
            column_issues, after = _apply_schema_step(schema, step, definition)
            step_issues.extend(column_issues)
            schema = after
        step_results.append(
            StepValidation(
                step_id=step.id,
                position=step.position,
                operation_code=definition.code,
                enabled=True,
                valid=not any(item.severity == "error" for item in step_issues),
                schema_before=before,
                schema_after=tuple(schema),
                issues=tuple(step_issues),
            )
        )
        issues.extend(item for item in step_issues if item.severity == "error")

    contract = derive_input_contract(ordered)
    compatibility = None
    if input_schema is not None:
        compatibility = analyze_compatibility(input_schema, contract)
        if not compatibility.compatible:
            issues.extend(compatibility.reasons)

    valid = not any(item.severity == "error" for item in issues) and not empty
    projected = tuple(schema) if input_schema is not None else tuple(input_schema or ())
    return WorkflowValidation(
        valid=valid,
        empty=empty,
        issues=tuple(issues),
        steps=tuple(step_results),
        contract=contract,
        compatibility=compatibility,
        projected_schema=projected,
    )


def derive_input_contract(steps: list[WorkflowStepSpec]) -> InputContract:
    produced: set[str] = set()
    required: dict[str, ContractColumn] = {}
    for step in sorted(steps, key=lambda item: item.position):
        if not step.enabled:
            continue
        try:
            definition = get_operation(step.operation_code)
        except UnsupportedTransformationError:
            continue
        params = step.parameters or {}
        referenced = _referenced_columns(definition, params)
        numeric = _requires_numeric(definition, params)
        for name in referenced:
            if name in produced or name in required:
                continue
            dtype = "numeric-compatible" if numeric else "any"
            required[name] = ContractColumn(
                name=name,
                dtype=dtype,
                numeric_compatible=numeric,
            )
        produced.update(_produced_names(definition, params))
        produced.difference_update(_removed_names(definition, params))
        rename = _rename_pair(definition, params)
        if rename is not None:
            old, new = rename
            produced.discard(old)
            produced.add(new)
    return InputContract(columns=tuple(required.values()))


def analyze_compatibility(
    schema: list[SchemaColumn],
    contract: InputContract,
) -> CompatibilityResult:
    available = {item.name: item for item in schema}
    reasons: list[ValidationIssue] = []
    for required in contract.columns:
        column = available.get(required.name)
        if column is None:
            reasons.append(
                ValidationIssue(
                    code="WORKFLOW_INCOMPATIBLE",
                    message=f"Missing required column: {required.name}",
                    column=required.name,
                )
            )
            continue
        if required.numeric_compatible and column.dtype not in NUMERIC_DTYPES | {
            "UNKNOWN"
        }:
            reasons.append(
                ValidationIssue(
                    code="WORKFLOW_INCOMPATIBLE",
                    message=(
                        f"Incompatible type: {required.name} expected "
                        f"numeric-compatible, found {column.dtype}"
                    ),
                    column=required.name,
                    details={
                        "expected": "numeric-compatible",
                        "found": column.dtype,
                    },
                )
            )
    if reasons:
        return CompatibilityResult(status="INCOMPATIBLE", reasons=tuple(reasons))
    return CompatibilityResult(status="COMPATIBLE")


def _position_issues(steps: list[WorkflowStepSpec]) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    seen: set[int] = set()
    for step in steps:
        if step.position < 0:
            issues.append(
                ValidationIssue(
                    code="WORKFLOW_REORDER_INVALID",
                    message="Step positions must be zero or greater.",
                    step_id=step.id,
                    position=step.position,
                )
            )
        if step.position in seen:
            issues.append(
                ValidationIssue(
                    code="WORKFLOW_REORDER_INVALID",
                    message=f"Duplicate step position {step.position}.",
                    step_id=step.id,
                    position=step.position,
                )
            )
        seen.add(step.position)
    return issues


def _parameter_issues(step: WorkflowStepSpec, definition: Any) -> list[ValidationIssue]:
    params = step.parameters
    issues: list[ValidationIssue] = []
    if not isinstance(params, dict):
        return [
            ValidationIssue(
                code="INVALID_TRANSFORMATION_PARAMETERS",
                message="Step parameters must be an object.",
                step_id=step.id,
                position=step.position,
                field="parameters",
            )
        ]
    for spec in definition.parameters:
        present = spec.name in params
        value = params.get(spec.name, spec.default)
        if spec.required and not present and spec.default is None:
            issues.append(
                ValidationIssue(
                    code="INVALID_TRANSFORMATION_PARAMETERS",
                    message=f'Parameter "{spec.name}" is required.',
                    step_id=step.id,
                    position=step.position,
                    field=spec.name,
                )
            )
            continue
        if value is None and spec.required and spec.default is None:
            issues.append(
                ValidationIssue(
                    code="INVALID_TRANSFORMATION_PARAMETERS",
                    message=f'Parameter "{spec.name}" is required.',
                    step_id=step.id,
                    position=step.position,
                    field=spec.name,
                )
            )
            continue
        if spec.type == "enum" and spec.options and value is not None:
            if value not in spec.options:
                issues.append(
                    ValidationIssue(
                        code="INVALID_TRANSFORMATION_PARAMETERS",
                        message=f'Parameter "{spec.name}" has an invalid value.',
                        step_id=step.id,
                        position=step.position,
                        field=spec.name,
                    )
                )
        if spec.type == "column" and value is not None and not isinstance(value, str):
            issues.append(
                ValidationIssue(
                    code="INVALID_TRANSFORMATION_PARAMETERS",
                    message="A column name is required.",
                    step_id=step.id,
                    position=step.position,
                    field=spec.name,
                )
            )
        if spec.type == "columns" and value is not None:
            if not isinstance(value, list) or any(
                not isinstance(item, str) for item in value
            ):
                issues.append(
                    ValidationIssue(
                        code="INVALID_TRANSFORMATION_PARAMETERS",
                        message="Select one or more columns.",
                        step_id=step.id,
                        position=step.position,
                        field=spec.name,
                    )
                )
        if spec.type == "string" and value is not None and not isinstance(value, str):
            issues.append(
                ValidationIssue(
                    code="INVALID_TRANSFORMATION_PARAMETERS",
                    message=f'Parameter "{spec.name}" must be text.',
                    step_id=step.id,
                    position=step.position,
                    field=spec.name,
                )
            )
    if definition.code == "FILL_MISSING" and params.get("strategy") == "constant":
        if "value" not in params:
            issues.append(
                ValidationIssue(
                    code="INVALID_TRANSFORMATION_PARAMETERS",
                    message="Provide a constant fill value.",
                    step_id=step.id,
                    position=step.position,
                    field="value",
                )
            )
    return issues


def _apply_schema_step(
    schema: list[SchemaColumn],
    step: WorkflowStepSpec,
    definition: Any,
) -> tuple[list[ValidationIssue], list[SchemaColumn]]:
    issues: list[ValidationIssue] = []
    params = step.parameters or {}
    by_name = {item.name: item for item in schema}
    referenced = _referenced_columns(definition, params)
    for name in referenced:
        column = by_name.get(name)
        if column is None:
            issues.append(
                ValidationIssue(
                    code="COLUMN_NOT_FOUND",
                    message=f'The column "{name}" was not found at this step.',
                    step_id=step.id,
                    position=step.position,
                    column=name,
                )
            )
            continue
        supported = {item.upper() for item in definition.supported_column_types}
        if supported and column.dtype not in supported:
            issues.append(
                ValidationIssue(
                    code="INCOMPATIBLE_COLUMN_TYPE",
                    message=(
                        f'Operation {definition.code} does not support {column.dtype} '
                        f'column "{name}".'
                    ),
                    step_id=step.id,
                    position=step.position,
                    column=name,
                    details={"dtype": column.dtype},
                )
            )
        if _requires_numeric(definition, params) and column.dtype not in NUMERIC_DTYPES | {
            "UNKNOWN"
        }:
            issues.append(
                ValidationIssue(
                    code="INCOMPATIBLE_COLUMN_TYPE",
                    message=(
                        f'Step requires a numeric-compatible column; "{name}" is '
                        f"{column.dtype}."
                    ),
                    step_id=step.id,
                    position=step.position,
                    column=name,
                )
            )

    next_schema = list(schema)
    if issues:
        return issues, next_schema
    if definition.code == "RENAME_COLUMN":
        old = params.get("column")
        new = params.get("new_name")
        if isinstance(old, str) and isinstance(new, str) and new.strip():
            cleaned = new.strip()
            if cleaned != new:
                issues.append(
                    ValidationIssue(
                        code="INVALID_TRANSFORMATION_PARAMETERS",
                        message="Column names cannot include leading or trailing whitespace.",
                        step_id=step.id,
                        position=step.position,
                        field="new_name",
                    )
                )
            elif cleaned in by_name and cleaned != old:
                issues.append(
                    ValidationIssue(
                        code="COLUMN_NAME_CONFLICT",
                        message=f'A column named "{cleaned}" already exists.',
                        step_id=step.id,
                        position=step.position,
                        column=cleaned,
                    )
                )
            else:
                next_schema = [
                    SchemaColumn(name=cleaned if item.name == old else item.name, dtype=item.dtype)
                    for item in next_schema
                ]
    elif definition.code == "DROP_COLUMN":
        name = params.get("column")
        if isinstance(name, str):
            if len(next_schema) <= 1:
                issues.append(
                    ValidationIssue(
                        code="LAST_COLUMN_CANNOT_BE_DROPPED",
                        message="The last remaining column cannot be dropped.",
                        step_id=step.id,
                        position=step.position,
                        column=name,
                    )
                )
            else:
                next_schema = [item for item in next_schema if item.name != name]
    elif definition.code == "CAST_TYPE":
        name = params.get("column")
        target = params.get("target_type")
        if isinstance(name, str) and isinstance(target, str):
            next_schema = [
                SchemaColumn(name=item.name, dtype=normalize_dtype(target))
                if item.name == name
                else item
                for item in next_schema
            ]
    return issues, next_schema


def _referenced_columns(definition: Any, params: dict[str, Any]) -> list[str]:
    names: list[str] = []
    for spec in definition.parameters:
        value = params.get(spec.name)
        if spec.type == "column" and isinstance(value, str) and value:
            names.append(value)
        if spec.type == "columns" and isinstance(value, list):
            names.extend(item for item in value if isinstance(item, str) and item)
    return names


def _requires_numeric(definition: Any, params: dict[str, Any]) -> bool:
    return definition.code == "FILL_MISSING" and params.get("strategy") in {
        "mean",
        "median",
    }


def _produced_names(definition: Any, params: dict[str, Any]) -> set[str]:
    if definition.code == "RENAME_COLUMN":
        new = params.get("new_name")
        if isinstance(new, str) and new.strip():
            return {new.strip()}
    return set()


def _removed_names(definition: Any, params: dict[str, Any]) -> set[str]:
    if definition.code == "DROP_COLUMN":
        name = params.get("column")
        if isinstance(name, str):
            return {name}
    if definition.code == "RENAME_COLUMN":
        name = params.get("column")
        if isinstance(name, str):
            return {name}
    return set()


def _rename_pair(definition: Any, params: dict[str, Any]) -> tuple[str, str] | None:
    if definition.code != "RENAME_COLUMN":
        return None
    old = params.get("column")
    new = params.get("new_name")
    if isinstance(old, str) and isinstance(new, str) and new.strip():
        return old, new.strip()
    return None
