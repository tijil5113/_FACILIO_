"""Queue adapters. Redis/RQ is production; in-memory is for tests."""

from __future__ import annotations

from typing import Protocol

from facilio.core.config import Settings
from facilio.core.errors import QueueUnavailableError
from facilio.core.logging import get_logger

logger = get_logger("facilio.queue")

TASK_NAME = "facilio.jobs.tasks.execute_workflow_job"


class JobQueue(Protocol):
    def enqueue(self, job_id: str) -> None: ...

    def ping(self) -> bool: ...

    def queued_count(self) -> int | None: ...

    def contains(self, job_id: str) -> bool: ...

    def backend(self) -> str: ...


class MemoryJobQueue:
    """Process-local queue used when REDIS_URL is unset (API tests)."""

    def __init__(self) -> None:
        self.items: list[str] = []
        self.fail_next = False

    def enqueue(self, job_id: str) -> None:
        if self.fail_next:
            self.fail_next = False
            raise QueueUnavailableError("The in-memory queue was asked to fail.")
        self.items.append(job_id)

    def ping(self) -> bool:
        return True

    def queued_count(self) -> int | None:
        return len(self.items)

    def contains(self, job_id: str) -> bool:
        return job_id in self.items

    def backend(self) -> str:
        return "memory"


class RedisJobQueue:
    def __init__(self, redis_url: str, queue_name: str) -> None:
        import redis
        from rq import Queue

        self._redis = redis.from_url(redis_url)
        self._queue = Queue(queue_name, connection=self._redis)
        self._queue_name = queue_name

    def enqueue(self, job_id: str) -> None:
        try:
            self._queue.enqueue(
                TASK_NAME,
                job_id,
                job_timeout=3600,
                result_ttl=600,
                failure_ttl=86400,
            )
        except Exception:
            logger.warning("queue enqueue failed job_id=%s", job_id)
            raise QueueUnavailableError(
                "The job could not be placed on the queue."
            ) from None

    def ping(self) -> bool:
        try:
            return bool(self._redis.ping())
        except Exception:
            return False

    def queued_count(self) -> int | None:
        try:
            return int(self._queue.count)
        except Exception:
            return None

    def contains(self, job_id: str) -> bool:
        try:
            needle = str(job_id)
            for item in self._queue.jobs:
                args = item.args or ()
                if args and str(args[0]) == needle:
                    return True
            return False
        except Exception:
            logger.warning("queue contains check failed job_id=%s", job_id)
            return False

    def backend(self) -> str:
        return "redis"


def build_queue(settings: Settings) -> JobQueue:
    if settings.REDIS_URL:
        return RedisJobQueue(settings.REDIS_URL, settings.JOB_QUEUE_NAME)
    return MemoryJobQueue()
