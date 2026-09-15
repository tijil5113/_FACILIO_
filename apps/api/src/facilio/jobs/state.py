"""Deterministic job status transitions."""

from __future__ import annotations

from facilio.core.errors import AppError

QUEUED = "QUEUED"
RUNNING = "RUNNING"
SUCCEEDED = "SUCCEEDED"
FAILED = "FAILED"
CANCEL_REQUESTED = "CANCEL_REQUESTED"
CANCELLED = "CANCELLED"

TERMINAL = frozenset({SUCCEEDED, FAILED, CANCELLED})
ACTIVE = frozenset({QUEUED, RUNNING, CANCEL_REQUESTED})
CLAIMABLE = frozenset({QUEUED})

ALLOWED: dict[str, frozenset[str]] = {
    QUEUED: frozenset({RUNNING, CANCELLED, FAILED}),
    RUNNING: frozenset({SUCCEEDED, FAILED, CANCEL_REQUESTED, CANCELLED}),
    CANCEL_REQUESTED: frozenset({CANCELLED, SUCCEEDED, FAILED}),
    FAILED: frozenset({QUEUED}),
    SUCCEEDED: frozenset(),
    CANCELLED: frozenset(),
}


def assert_transition(current: str, target: str) -> None:
    allowed = ALLOWED.get(current, frozenset())
    if target not in allowed:
        raise AppError(
            "JOB_INVALID_STATE",
            f"A {current} job cannot transition to {target}.",
            status_code=409,
            details={"current": current, "target": target},
        )


def is_terminal(status: str) -> bool:
    return status in TERMINAL
