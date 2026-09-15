"""Shared API test fixtures."""

from __future__ import annotations

import pytest

from facilio.app import create_app
from facilio.core.config import Settings


def make_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "APP_ENV": "testing",
        "SECRET_KEY": "test-secret-key-not-for-production",
        "DATABASE_URL": "sqlite:///:memory:",
        "CORS_ORIGINS": "http://localhost:5173",
        "LOG_LEVEL": "WARNING",
        "REDIS_URL": "",
    }
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


@pytest.fixture
def settings() -> Settings:
    return make_settings()


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


@pytest.fixture
def client(app):
    return app.test_client()
