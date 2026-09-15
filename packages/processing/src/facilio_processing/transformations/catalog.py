"""Registered transformation operations."""

from __future__ import annotations

from facilio_processing.transformations.base import OperationDefinition, to_catalog_dict
from facilio_processing.transformations.columns import DROP_COLUMN, RENAME_COLUMN
from facilio_processing.transformations.duplicates import REMOVE_DUPLICATES
from facilio_processing.transformations.errors import UnsupportedTransformationError
from facilio_processing.transformations.missing import DROP_MISSING_ROWS, FILL_MISSING
from facilio_processing.transformations.text import NORMALIZE_CASE, REPLACE_VALUE, TRIM
from facilio_processing.transformations.types import CAST_TYPE

OPERATIONS: tuple[OperationDefinition, ...] = (
    TRIM,
    NORMALIZE_CASE,
    REPLACE_VALUE,
    FILL_MISSING,
    DROP_MISSING_ROWS,
    REMOVE_DUPLICATES,
    RENAME_COLUMN,
    DROP_COLUMN,
    CAST_TYPE,
)

_BY_CODE = {item.code: item for item in OPERATIONS}


def get_operation(code: str) -> OperationDefinition:
    key = (code or "").strip().upper()
    operation = _BY_CODE.get(key)
    if operation is None:
        raise UnsupportedTransformationError(
            f'Transformation "{code}" is not supported.',
            details={"operation": code},
        )
    return operation


def catalog() -> list[dict]:
    return [to_catalog_dict(item) for item in OPERATIONS]
