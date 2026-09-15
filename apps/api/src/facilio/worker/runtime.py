"""Background worker process. Does not start the HTTP server."""

from __future__ import annotations

import argparse
import signal
import sys

from facilio.app import create_app
from facilio.core.config import get_settings
from facilio.core.logging import configure_logging, get_logger
from facilio.services.job_executor import JobExecutor, default_worker_id

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
        settings = app.config["FACILIO_SETTINGS"]
        database = app.extensions["database"]
        return JobExecutor(settings, database).recover_stale()


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

    def _heartbeat(_signum=None, _frame=None) -> None:
        with app.app_context():
            JobExecutor(
                settings, app.extensions["database"], worker_id=worker_id
            ).heartbeat_worker()

    def _shutdown(_signum, _frame) -> None:
        logger.info("worker shutdown requested worker_id=%s", worker_id)
        with app.app_context():
            JobExecutor(
                settings, app.extensions["database"], worker_id=worker_id
            ).heartbeat_worker(status="STOPPING")

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)
    with app.app_context():
        JobExecutor(
            settings, app.extensions["database"], worker_id=worker_id
        ).heartbeat_worker()
        try:
            recover_stale_jobs()
        except Exception:
            logger.exception("stale job recovery failed at startup")
    logger.info(
        "worker starting queue=%s worker_id=%s",
        settings.JOB_QUEUE_NAME,
        worker_id,
    )
    worker = Worker([queue], connection=connection, name=worker_id)
    worker.work(with_scheduler=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
