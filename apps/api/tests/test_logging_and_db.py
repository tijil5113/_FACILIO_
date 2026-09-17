"""Logging and database helper tests."""

import json
import logging

from facilio.core.logging import JsonFormatter, configure_logging
from facilio.db.session import Database
from tests.conftest import make_settings


def test_json_formatter_includes_request_id() -> None:
    record = logging.LogRecord(
        name="facilio",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="hello",
        args=(),
        exc_info=None,
    )
    record.request_id = "abc-123"
    payload = json.loads(JsonFormatter().format(record))
    assert payload["message"] == "hello"
    assert payload["request_id"] == "abc-123"
    assert payload["level"] == "INFO"


def test_configure_logging_production_uses_json(capsys) -> None:
    settings = make_settings(
        APP_ENV="production",
        SECRET_KEY="a" * 32,
        LOG_LEVEL="INFO",
        DATABASE_URL="postgresql+psycopg://facilio:x@localhost:5432/facilio",
        CORS_ORIGINS="https://app.example.com",
        REDIS_URL="redis://localhost:6379/0",
    )
    configure_logging(settings)
    logging.getLogger("facilio").info("startup-complete")
    captured = capsys.readouterr().out
    assert "startup-complete" in captured
    assert captured.strip().startswith("{")


def test_database_session_context() -> None:
    database = Database(make_settings())
    sessions = database.session()
    session = next(sessions)
    assert session is not None
    sessions.close()
