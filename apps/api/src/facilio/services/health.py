"""Health and readiness application services."""

from __future__ import annotations

from facilio import __version__
from facilio.core.config import Settings
from facilio.core.errors import DatabaseNotConfiguredError, DatabaseUnavailableError
from facilio.jobs.queue import JobQueue, build_queue
from facilio.repositories.database_probe import DatabaseProbeRepository
from facilio.schemas.health import CheckResult, HealthData, ReadinessData


class HealthService:
    def __init__(
        self,
        settings: Settings,
        probe: DatabaseProbeRepository,
        queue: JobQueue | None = None,
    ) -> None:
        self._settings = settings
        self._probe = probe
        self._queue = queue if queue is not None else build_queue(settings)

    def health(self) -> HealthData:
        return HealthData(
            status="healthy",
            service=self._settings.APP_NAME,
            version=__version__,
        )

    def readiness(self) -> ReadinessData:
        database_check = self._database_check()
        queue_check = self._queue_check()
        ready = database_check.status == "ready" and queue_check.status in {
            "ready",
            "not_configured",
        }
        return ReadinessData(
            status="ready" if ready else "not_ready",
            checks={"database": database_check, "queue": queue_check},
        )

    def _database_check(self) -> CheckResult:
        try:
            self._probe.probe()
        except DatabaseNotConfiguredError:
            return CheckResult(
                status="not_configured",
                message="A database URL has not been configured.",
            )
        except DatabaseUnavailableError:
            return CheckResult(
                status="unavailable",
                message="The database did not accept a connection.",
            )
        return CheckResult(
            status="ready",
            message="Database accepted a connection.",
        )

    def _queue_check(self) -> CheckResult:
        if not self._settings.REDIS_URL:
            return CheckResult(
                status="not_configured",
                message="REDIS_URL is not set. Jobs use an in-process memory queue.",
            )
        if self._queue.ping():
            return CheckResult(
                status="ready",
                message="Redis accepted a ping.",
            )
        return CheckResult(
            status="unavailable",
            message="The job queue did not accept a connection.",
        )
