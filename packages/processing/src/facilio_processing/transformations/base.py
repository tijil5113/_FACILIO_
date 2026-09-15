"""Shared helpers for registered operations."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import pandas as pd

from facilio_processing.inference import is_missing
from facilio_processing.serialization import json_safe
from facilio_processing.transformations.errors import (
    ColumnNotFoundError,
    InvalidTransformationParametersError,
)
from facilio_processing.transformations.result import ChangeExample

ParameterType = str


@dataclass(frozen=True, slots=True)
class ParameterSpec:
    name: str
    type: ParameterType
    required: bool
    description: str
    options: tuple[str, ...] | None = None
    default: Any = None


@dataclass(frozen=True, slots=True)
class OperationDefinition:
    code: str
    display_name: str
    description: str
    category: str
    supported_column_types: tuple[str, ...]
    parameters: tuple[ParameterSpec, ...]
    apply: Callable[[pd.DataFrame, dict[str, Any], int], tuple[pd.DataFrame, dict[str, Any]]]
    dataset_level: bool = False
    notes: tuple[str, ...] = field(default_factory=tuple)


def copy_frame(frame: pd.DataFrame) -> pd.DataFrame:
    return frame.copy(deep=True)


def set_column(frame: pd.DataFrame, name: str, values: list[Any]) -> None:
    frame[name] = pd.Series(values, index=frame.index, dtype=object)


def require_column(frame: pd.DataFrame, name: Any) -> str:
    if not isinstance(name, str) or not name:
        raise InvalidTransformationParametersError(
            "A column name is required.",
            details={"field": "column"},
        )
    if name not in frame.columns:
        raise ColumnNotFoundError(
            f'The column "{name}" was not found.',
            details={"column": name},
        )
    return name


def require_columns(frame: pd.DataFrame, names: Any) -> list[str]:
    if names is None:
        return [str(column) for column in frame.columns]
    if not isinstance(names, list) or not names:
        raise InvalidTransformationParametersError(
            "Select one or more columns.",
            details={"field": "columns"},
        )
    resolved: list[str] = []
    for item in names:
        resolved.append(require_column(frame, item))
    return resolved


def cell_example(
    row_index: int,
    column: str,
    before: Any,
    after: Any,
) -> ChangeExample:
    return ChangeExample(
        kind="cell",
        row_index=row_index,
        column=column,
        before=json_safe(before),
        after=json_safe(after),
    )


def values_equal(left: Any, right: Any) -> bool:
    if is_missing(left) and is_missing(right):
        return True
    if is_missing(left) or is_missing(right):
        return False
    return left == right


def to_catalog_dict(definition: OperationDefinition) -> dict[str, Any]:
    return {
        "code": definition.code,
        "display_name": definition.display_name,
        "description": definition.description,
        "category": definition.category,
        "supported_column_types": list(definition.supported_column_types),
        "dataset_level": definition.dataset_level,
        "notes": list(definition.notes),
        "parameters": [
            {
                "name": item.name,
                "type": item.type,
                "required": item.required,
                "description": item.description,
                "options": list(item.options) if item.options else None,
                "default": item.default,
            }
            for item in definition.parameters
        ],
    }
