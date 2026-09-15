"""Background worker process. Does not start the HTTP server."""

from __future__ import annotations

import argparse
import signal
import sys
import threading

from facilio.app import create_app
from facilio.core.config import get_settings
from facilio.core.logging import configure_logging, get_logger
from facilio.services.job_executor import JobExecutor, default_worker_id
from facilio.worker.heartbeat import HeartbeatLoop

logger = get_logger("facilio.worker")


def process_job(job_id: str) -> None:
    app = _worker_app()
    with app.app_context():
        settings = app.config["FACILIO_SETTINGS"]
        database = app.extensions["database"]
        JobExecutor(settings, database, worker_id=default_worker_id()).execute(job_id)


def recover_stale_jobs() -> int:
    app = _worker_app()
    with app.app_context():
        from facilio.services.jobs import JobService

        settings = app.config["FACILIO_SETTINGS"]
        database = app.extensions["database"]
        queue = app.extensions["job_queue"]
        return JobService(settings, database, queue).recover_stale()


_APP = None


def _worker_app():
    global _APP
    if _APP is None:
        _APP = create_app()
    return _APP


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="FACILIO job worker")
    parser.add_argument(
        "command",
        nargs="?",
        default="work",
        choices=("work", "recover"),
    )
    args = parser.parse_args(argv)
    settings = get_settings()
    configure_logging(settings)
    if args.command == "recover":
        count = recover_stale_jobs()
        logger.info("stale jobs recovered count=%s", count)
        return 0
    if not settings.REDIS_URL:
        logger.error("REDIS_URL is required for facilio-worker")
        return 2
    import redis
    from rq import Queue, Worker

    app = create_app(settings)
    connection = redis.from_url(settings.REDIS_URL)
    queue = Queue(settings.JOB_QUEUE_NAME, connection=connection)
    worker_id = default_worker_id()
    stop = threading.Event()
    heartbeat = HeartbeatLoop(
        settings.WORKER_HEARTBEAT_SECONDS,
        lambda: _beat(app, settings, worker_id),
        stop_event=stop,
    )

    def _shutdown(_signum, _frame) -> None:
        logger.info("worker shutdown requested worker_id=%s", worker_id)
        stop.set()
        heartbeat.stop()
        with app.app_context():
            JobExecutor(
                settings, app.extensions["database"], worker_id=worker_id
            ).heartbeat_worker(status="STOPPING")

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)
    with app.app_context():
        try:
            recover_stale_jobs()
        except Exception:
            logger.exception("stale job recovery failed at startup")
    logger.info(
        "worker starting queue=%s worker_id=%s database=%s heartbeat_s=%s",
        settings.JOB_QUEUE_NAME,
        worker_id,
        settings.database_identity(),
        settings.WORKER_HEARTBEAT_SECONDS,
    )
    heartbeat.start()
    try:
        worker = Worker([queue], connection=connection, name=worker_id)
        worker.work(with_scheduler=False)
    finally:
        heartbeat.stop()
        with app.app_context():
            JobExecutor(
                settings, app.extensions["database"], worker_id=worker_id
            ).heartbeat_worker(status="STOPPING")
    return 0


def _beat(app, settings, worker_id: str) -> None:
    with app.app_context():
        JobExecutor(
            settings, app.extensions["database"], worker_id=worker_id
        ).heartbeat_worker()
        try:
            recover_stale_jobs()
        except Exception:
            logger.exception("stale job recovery failed during heartbeat")


if __name__ == "__main__":
    sys.exit(main())
