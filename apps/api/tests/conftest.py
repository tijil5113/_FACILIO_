"""Shared API test fixtures."""

from __future__ import annotations

from collections.abc import Iterator

import pytest

from facilio.app import create_app
from facilio.core.config import Settings, clear_settings_cache

# Dummy value for isolated tests and CI. Not a production credential.
TEST_SECRET_KEY = "test-secret-key-not-for-production"


def make_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "APP_ENV": "testing",
        "SECRET_KEY": TEST_SECRET_KEY,
        "DATABASE_URL": "sqlite:///:memory:",
        "CORS_ORIGINS": "http://localhost:5173",
        "LOG_LEVEL": "WARNING",
        "REDIS_URL": "",
    }
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


@pytest.fixture(autouse=True)
def _test_process_environment(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Give every test a deterministic process env, independent of local .env.

    Worker CLI entrypoints call get_settings() from the process environment.
    GitHub Actions has no repository-root .env, so tests must supply a dummy
    SECRET_KEY themselves. Production Settings still require a real secret.
    """
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.setenv("SECRET_KEY", TEST_SECRET_KEY)
    clear_settings_cache()
    yield
    clear_settings_cache()


@pytest.fixture
def settings() -> Settings:
    return make_settings()


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


@pytest.fixture
def client(app):
    return app.test_client()
