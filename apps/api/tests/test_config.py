"""Configuration validation tests."""

import os

import pytest
from pydantic import ValidationError

from facilio.core.config import Settings, clear_settings_cache, get_settings
from tests.conftest import TEST_SECRET_KEY


def test_production_rejects_weak_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(
            APP_ENV="production",
            SECRET_KEY="change-me",
            DATABASE_URL="postgresql+psycopg://facilio:x@localhost:5432/facilio",
            CORS_ORIGINS="https://app.example.com",
        )


def test_production_rejects_wildcard_cors() -> None:
    with pytest.raises(ValidationError):
        Settings(
            APP_ENV="production",
            SECRET_KEY="a" * 32,
            DATABASE_URL="postgresql+psycopg://facilio:x@localhost:5432/facilio",
            CORS_ORIGINS="*",
        )


def test_production_requires_database_url() -> None:
    with pytest.raises(ValidationError):
        Settings(
            APP_ENV="production",
            SECRET_KEY="a" * 32,
            DATABASE_URL="",
            CORS_ORIGINS="https://app.example.com",
        )


def test_cors_origin_list_parses_csv() -> None:
    settings = Settings(
        APP_ENV="development",
        SECRET_KEY="dev-key",
        DATABASE_URL="",
        CORS_ORIGINS="http://localhost:5173, http://127.0.0.1:5173",
    )
    assert settings.cors_origin_list() == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_invalid_log_level_is_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(
            APP_ENV="testing",
            SECRET_KEY="dev-key",
            LOG_LEVEL="VERBOSE",
        )


def test_get_settings_reads_environment(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.setenv("SECRET_KEY", "env-secret")
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("LOG_LEVEL", "ERROR")
    clear_settings_cache()
    settings = get_settings()
    assert settings.SECRET_KEY == "env-secret"
    assert settings.LOG_LEVEL == "ERROR"
    clear_settings_cache()


def test_development_allows_empty_database_url() -> None:
    settings = Settings(
        APP_ENV="development",
        SECRET_KEY="dev-key",
        DATABASE_URL="",
        CORS_ORIGINS="http://localhost:5173",
    )
    assert settings.DATABASE_URL == ""
    assert settings.is_production() is False


def test_database_identity_omits_credentials() -> None:
    settings = Settings(
        APP_ENV="development",
        SECRET_KEY="dev-key",
        DATABASE_URL="postgresql+psycopg://facilio:secret-password@localhost:5432/facilio",
    )
    assert settings.database_backend() == "PostgreSQL"
    identity = settings.database_identity()
    assert "secret-password" not in identity
    assert "facilio" in identity
    assert identity == "postgresql://localhost:5432/facilio"


def test_development_rejects_sqlite_when_root_env_is_postgres(monkeypatch) -> None:
    from facilio.core import config as config_mod

    monkeypatch.setattr(
        config_mod, "_env_file_database_backend", lambda _path: "PostgreSQL"
    )
    with pytest.raises(
        ValidationError, match=r"repository-root \.env specifies PostgreSQL"
    ):
        Settings(
            APP_ENV="development",
            SECRET_KEY="dev-key",
            DATABASE_URL="sqlite:///facilio.db",
        )


def test_get_settings_drops_flask_injected_sqlite(monkeypatch) -> None:
    from facilio.core import config as config_mod

    monkeypatch.setenv("DATABASE_URL", "sqlite:///facilio.db")
    monkeypatch.setattr(
        config_mod, "_env_file_database_backend", lambda _path: "PostgreSQL"
    )
    config_mod.clear_settings_cache()
    config_mod._prefer_canonical_database_url()
    assert os.environ.get("DATABASE_URL") is None


def test_canonical_env_file_is_repository_root() -> None:
    from facilio.core.config import canonical_env_file, repository_root

    env_file = canonical_env_file()
    assert env_file == repository_root() / ".env"
    assert env_file.parent == repository_root()
    assert "apps/api" not in str(env_file)


def test_get_settings_uses_isolated_test_secret() -> None:
    clear_settings_cache()
    settings = get_settings()
    assert settings.SECRET_KEY == TEST_SECRET_KEY
    assert settings.is_testing()
    clear_settings_cache()


def test_settings_reject_missing_secret_key(monkeypatch) -> None:
    monkeypatch.delenv("SECRET_KEY", raising=False)
    clear_settings_cache()
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
    clear_settings_cache()
