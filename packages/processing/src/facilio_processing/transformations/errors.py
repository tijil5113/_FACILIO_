"""Typed transformation failures. Codes map to the API contract."""

from __future__ import annotations

from facilio_processing.errors import ProcessingError


class TransformationError(ProcessingError):
    code = "TRANSFORMATION_FAILED"


class UnsupportedTransformationError(TransformationError):
    code = "UNSUPPORTED_TRANSFORMATION"


class InvalidTransformationParametersError(TransformationError):
    code = "INVALID_TRANSFORMATION_PARAMETERS"


class ColumnNotFoundError(TransformationError):
    code = "COLUMN_NOT_FOUND"


class ColumnNameConflictError(TransformationError):
    code = "COLUMN_NAME_CONFLICT"


class IncompatibleColumnTypeError(TransformationError):
    code = "INCOMPATIBLE_COLUMN_TYPE"


class CastFailedError(TransformationError):
    code = "CAST_FAILED"


class NoNumericValuesError(TransformationError):
    code = "NO_NUMERIC_VALUES"


class LastColumnCannotBeDroppedError(TransformationError):
    code = "LAST_COLUMN_CANNOT_BE_DROPPED"


class TransformationNoOpError(TransformationError):
    code = "TRANSFORMATION_NOOP"
