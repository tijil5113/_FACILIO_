"""Configuration validation tests."""

import os
from pathlib import Path

import pytest
from pydantic import ValidationError

from facilio.core.config import (
    Settings,
    _detect_repository_root,
    canonical_env_file,
    clear_settings_cache,
    get_settings,
    normalize_database_url,
    repository_root,
)
from tests.conftest import TEST_SECRET_KEY

_PRODUCTION_POSTGRES = "postgresql+psycopg://facilio:x@localhost:5432/facilio"
_PRODUCTION_REDIS = "redis://localhost:6379/0"
_PRODUCTION_ORIGIN = "https://app.example.com"


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
    env_file = canonical_env_file()
    assert env_file == repository_root() / ".env"
    assert env_file.parent == repository_root()
    assert "apps/api" not in str(env_file)
    assert (repository_root() / "apps" / "api" / "pyproject.toml").is_file()


def test_detect_repository_root_handles_shallow_docker_paths(tmp_path: Path) -> None:
    detected = _detect_repository_root(Path("/app/src/facilio/core/config.py"))
    assert Path("/") == detected
    checkout = (
        tmp_path / "repo" / "apps" / "api" / "src" / "facilio" / "core" / "config.py"
    )
    checkout.parent.mkdir(parents=True)
    checkout.write_text("# marker\n", encoding="utf-8")
    (tmp_path / "repo" / "apps" / "api" / "pyproject.toml").write_text(
        "[project]\nname='facilio-api'\n",
        encoding="utf-8",
    )
    assert tmp_path / "repo" == _detect_repository_root(checkout)


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


def test_normalize_database_url_rewrites_postgresql_scheme() -> None:
    raw = "postgresql://facilio:super-secret@db.example:5432/facilio?sslmode=require"
    normalized = normalize_database_url(raw)
    assert normalized.startswith("postgresql+psycopg://")
    assert normalized == (
        "postgresql+psycopg://facilio:super-secret@db.example:5432/facilio"
        "?sslmode=require"
    )
    assert normalize_database_url(normalized) == normalized


def test_normalize_database_url_rewrites_postgres_scheme() -> None:
    raw = "postgres://facilio:super-secret@db.example:5432/facilio"
    assert (
        normalize_database_url(raw)
        == "postgresql+psycopg://facilio:super-secret@db.example:5432/facilio"
    )


def test_normalize_database_url_leaves_sqlite_and_other_schemes() -> None:
    assert normalize_database_url("sqlite:///:memory:") == "sqlite:///:memory:"
    assert normalize_database_url("sqlite:///facilio.db") == "sqlite:///facilio.db"
    mysql = "mysql://user:secret@localhost/app"
    assert normalize_database_url(mysql) == mysql
    assert normalize_database_url("") == ""
    assert normalize_database_url("  postgresql://u:p@h:5432/db  ") == (
        "postgresql+psycopg://u:p@h:5432/db"
    )


def test_settings_normalize_railway_database_url_without_logging_secret(
    caplog,
) -> None:
    raw = "postgresql://facilio:super-secret@db.example:5432/facilio"
    settings = Settings(
        APP_ENV="production",
        SECRET_KEY="a" * 32,
        DATABASE_URL=raw,
        CORS_ORIGINS=_PRODUCTION_ORIGIN,
        REDIS_URL=_PRODUCTION_REDIS,
    )
    assert settings.DATABASE_URL.startswith("postgresql+psycopg://")
    assert settings.database_backend() == "PostgreSQL"
    identity = settings.database_identity()
    assert "super-secret" not in identity
    assert "super-secret" not in caplog.text
    assert identity == "postgresql://db.example:5432/facilio"


def test_production_requires_redis_url() -> None:
    with pytest.raises(ValidationError, match="REDIS_URL is required in production"):
        Settings(
            APP_ENV="production",
            SECRET_KEY="a" * 32,
            DATABASE_URL=_PRODUCTION_POSTGRES,
            CORS_ORIGINS=_PRODUCTION_ORIGIN,
            REDIS_URL="",
        )


def test_production_rejects_blank_redis_url() -> None:
    with pytest.raises(ValidationError, match="REDIS_URL is required in production"):
        Settings(
            APP_ENV="production",
            SECRET_KEY="a" * 32,
            DATABASE_URL=_PRODUCTION_POSTGRES,
            CORS_ORIGINS=_PRODUCTION_ORIGIN,
            REDIS_URL="   ",
        )


def test_production_rejects_sqlite() -> None:
    with pytest.raises(ValidationError, match="PostgreSQL"):
        Settings(
            APP_ENV="production",
            SECRET_KEY="a" * 32,
            DATABASE_URL="sqlite:///:memory:",
            CORS_ORIGINS=_PRODUCTION_ORIGIN,
            REDIS_URL=_PRODUCTION_REDIS,
        )


def test_testing_and_development_allow_memory_queue() -> None:
    testing = Settings(
        APP_ENV="testing",
        SECRET_KEY=TEST_SECRET_KEY,
        DATABASE_URL="sqlite:///:memory:",
        REDIS_URL="",
    )
    development = Settings(
        APP_ENV="development",
        SECRET_KEY="dev-key",
        DATABASE_URL="",
        REDIS_URL="",
        CORS_ORIGINS="http://localhost:5173",
    )
    assert testing.REDIS_URL == ""
    assert development.REDIS_URL == ""


def test_production_accepts_strong_secret_postgres_and_redis() -> None:
    settings = Settings(
        APP_ENV="production",
        SECRET_KEY="a" * 32,
        DATABASE_URL=_PRODUCTION_POSTGRES,
        CORS_ORIGINS=_PRODUCTION_ORIGIN,
        REDIS_URL=_PRODUCTION_REDIS,
        UPLOAD_ROOT="/app/runtime/uploads",
    )
    assert settings.is_production()
    assert settings.upload_root_path().as_posix() == "/app/runtime/uploads"
    assert settings.REDIS_URL == _PRODUCTION_REDIS
