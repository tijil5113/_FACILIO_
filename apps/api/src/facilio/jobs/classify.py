"""Safe job error classification. Stack traces stay in server logs."""

from __future__ import annotations

VALIDATION = "VALIDATION"
DATA = "DATA"
INFRASTRUCTURE = "INFRASTRUCTURE"
WORKER = "WORKER"
INTERNAL = "INTERNAL"

_DATA_CODES = frozenset(
    {
        "CAST_FAILED",
        "COLUMN_NOT_FOUND",
        "WORKFLOW_INCOMPATIBLE",
        "WORKFLOW_INVALID",
        "WORKFLOW_EMPTY",
        "WORKFLOW_NOOP",
        "WORKFLOW_RUN_FAILED",
        "UNSUPPORTED_TRANSFORMATION",
        "WORKFLOW_EXECUTION_FAILED",
    }
)
_VALIDATION_CODES = frozenset(
    {
        "VALIDATION_ERROR",
        "WORKFLOW_ARCHIVED",
        "WORKFLOW_INPUT_VERSION_NOT_FOUND",
        "JOB_INVALID_STATE",
        "JOB_CANCEL_NOT_ALLOWED",
        "JOB_RETRY_NOT_ALLOWED",
        "JOB_ATTEMPTS_EXHAUSTED",
    }
)
_INFRA_CODES = frozenset(
    {
        "QUEUE_UNAVAILABLE",
        "QUEUE_DISPATCH_FAILED",
        "QUEUE_ORPHAN",
        "DATABASE_UNAVAILABLE",
        "DATABASE_NOT_CONFIGURED",
    }
)
_WORKER_CODES = frozenset({"WORKER_LOST"})
_RETRYABLE_CODES = frozenset(
    {
        "QUEUE_UNAVAILABLE",
        "QUEUE_DISPATCH_FAILED",
        "QUEUE_ORPHAN",
        "WORKER_LOST",
        "DATABASE_UNAVAILABLE",
        "JOB_FINALIZATION_FAILED",
    }
)


def classify(error_code: str | None) -> str:
    code = error_code or "INTERNAL"
    if code in _VALIDATION_CODES:
        return VALIDATION
    if code in _DATA_CODES:
        return DATA
    if code in _INFRA_CODES:
        return INFRASTRUCTURE
    if code in _WORKER_CODES:
        return WORKER
    return INTERNAL


def is_retryable(error_code: str | None, category: str | None = None) -> bool:
    if error_code in _RETRYABLE_CODES:
        return True
    resolved = category or classify(error_code)
    return resolved in (INFRASTRUCTURE, WORKER)
