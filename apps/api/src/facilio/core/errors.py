"""Application error types that map to the public API contract."""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Expected, structured application failure."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 400,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class NotFoundError(AppError):
    def __init__(self, message: str = "The requested resource was not found.") -> None:
        super().__init__("NOT_FOUND", message, status_code=404)


class DatasetNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "DATASET_NOT_FOUND",
            "The requested dataset was not found.",
            status_code=404,
        )


class VersionNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "VERSION_NOT_FOUND",
            "The requested dataset version was not found.",
            status_code=404,
        )


class ProfileNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "PROFILE_NOT_FOUND",
            "This dataset has not been profiled yet.",
            status_code=404,
        )


class ProfileNotReadyError(AppError):
    def __init__(self, message: str = "Dataset profiling is not available.") -> None:
        super().__init__("PROFILE_NOT_READY", message, status_code=409)


class DatabaseNotConfiguredError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "DATABASE_NOT_CONFIGURED",
            "A database URL has not been configured.",
            status_code=503,
        )


class DatabaseUnavailableError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "DATABASE_UNAVAILABLE",
            "The database did not accept a connection.",
            status_code=503,
        )


class WorkflowNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "WORKFLOW_NOT_FOUND",
            "The requested workflow was not found.",
            status_code=404,
        )


class WorkflowStepNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "WORKFLOW_STEP_NOT_FOUND",
            "The requested workflow step was not found.",
            status_code=404,
        )


class WorkflowRunNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "WORKFLOW_RUN_NOT_FOUND",
            "The requested workflow run was not found.",
            status_code=404,
        )


class JobNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "JOB_NOT_FOUND",
            "The requested job was not found.",
            status_code=404,
        )


class QueueUnavailableError(AppError):
    def __init__(self, message: str = "The job queue is not available.") -> None:
        super().__init__("QUEUE_UNAVAILABLE", message, status_code=503)
