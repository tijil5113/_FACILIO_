"""Environment-driven application configuration."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal, Self

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

type EnvironmentName = Literal["development", "testing", "production"]

_POSTGRESQL_SCHEME = "postgresql://"
_POSTGRES_SCHEME = "postgres://"
_PSYCOPG_SCHEME = "postgresql+psycopg://"

_WEAK_SECRETS = frozenset(
    {
        "",
        "change-me",
        "secret",
        "secret-key",
        "replace-with-a-long-random-string",
        "dev-only-change-before-production-use-32b",
    }
)


def repository_root() -> Path:
    """Return the FACILIO repository root when running from source.

    Local checkouts resolve ``apps/api/src/facilio/core`` → five parents.
    Installed images (``/app/src`` or site-packages) have a shallower tree, so
    this walks for ``apps/api/pyproject.toml`` and otherwise falls back without
    requiring a fixed parent index.
    """
    return _detect_repository_root(Path(__file__))


def _detect_repository_root(start: Path) -> Path:
    here = start.resolve()
    for parent in here.parents:
        if (parent / "apps" / "api" / "pyproject.toml").is_file():
            return parent
    parents = list(here.parents)
    if not parents:
        return here.parent
    return parents[min(5, len(parents) - 1)]


def canonical_env_file() -> Path:
    return repository_root() / ".env"


def _env_file_database_backend(path: Path) -> str | None:
    if not path.is_file():
        return None
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped.startswith("DATABASE_URL="):
            continue
        raw = stripped.split("=", 1)[1].strip().strip("'").strip('"')
        if not raw:
            return "unconfigured"
        backend = make_url(raw).get_backend_name()
        if backend == "postgresql":
            return "PostgreSQL"
        if backend == "sqlite":
            return "SQLite"
        return backend
    return None


def _prefer_canonical_database_url() -> None:
    """Stop Flask's cwd .env from forcing SQLite over the root PostgreSQL URL."""
    if _env_file_database_backend(canonical_env_file()) != "PostgreSQL":
        return
    current = os.environ.get("DATABASE_URL", "").strip()
    if not current:
        return
    try:
        backend = make_url(current).get_backend_name()
    except Exception:
        return
    if backend == "sqlite":
        os.environ.pop("DATABASE_URL", None)


def normalize_database_url(url: str) -> str:
    """Rewrite Railway-style Postgres URLs to SQLAlchemy's psycopg3 dialect.

    Only the scheme is changed. Credentials are never logged.
    ``postgresql+psycopg://``, SQLite, and unrelated schemes are left intact.
    """
    stripped = url.strip()
    if not stripped:
        return stripped
    if stripped.startswith(_PSYCOPG_SCHEME):
        return stripped
    if stripped.startswith(_POSTGRESQL_SCHEME):
        return _PSYCOPG_SCHEME + stripped[len(_POSTGRESQL_SCHEME) :]
    if stripped.startswith(_POSTGRES_SCHEME):
        return _PSYCOPG_SCHEME + stripped[len(_POSTGRES_SCHEME) :]
    return stripped


class Settings(BaseSettings):
    """Validated runtime settings loaded from the process environment.

    Local development loads only the repository-root `.env`. Competing
    `apps/api/.env` files are ignored so API and worker cannot silently
    target different databases.
    """

    model_config = SettingsConfigDict(
        env_file=canonical_env_file() if canonical_env_file().is_file() else None,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    APP_ENV: EnvironmentName = "development"
    SECRET_KEY: str = Field(min_length=1)
    DATABASE_URL: str = ""
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    LOG_LEVEL: str = "INFO"
    MAX_CONTENT_LENGTH: int = Field(default=18 * 1024 * 1024, ge=1024)
    MAX_UPLOAD_SIZE_MB: int = Field(default=16, ge=1, le=512)
    PREVIEW_MAX_ROWS: int = Field(default=100, ge=1, le=500)
    PREVIEW_MAX_COLUMNS: int = Field(default=200, ge=1, le=2000)
    UPLOAD_ROOT: str = "runtime/uploads"
    PROFILE_TOP_VALUES_LIMIT: int = Field(default=10, ge=1, le=50)
    PROFILE_EVIDENCE_LIMIT: int = Field(default=8, ge=1, le=25)
    PROFILE_HISTOGRAM_BINS: int = Field(default=10, ge=1, le=50)
    PROFILE_DUPLICATE_GROUPS_LIMIT: int = Field(default=5, ge=1, le=25)
    APP_NAME: str = "facilio-api"
    APP_VERSION: str = "0.1.0"
    MAX_WORKFLOW_STEPS: int = Field(default=50, ge=1, le=200)
    REDIS_URL: str = ""
    JOB_QUEUE_NAME: str = "workflows"
    MAX_JOB_ATTEMPTS: int = Field(default=3, ge=1, le=20)
    JOB_STALE_SECONDS: int = Field(default=90, ge=15, le=3600)
    WORKER_HEARTBEAT_SECONDS: int = Field(default=30, ge=5, le=300)

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def coerce_database_url(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        return normalize_database_url(value)

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def coerce_redis_url(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("LOG_LEVEL")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        level = value.upper()
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if level not in allowed:
            msg = f"LOG_LEVEL must be one of {sorted(allowed)}"
            raise ValueError(msg)
        return level

    @field_validator("CORS_ORIGINS")
    @classmethod
    def strip_origins(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_environment_invariants(self) -> Self:
        if self.APP_ENV == "production":
            if self.SECRET_KEY.strip().lower() in _WEAK_SECRETS:
                raise ValueError("SECRET_KEY is missing or too weak for production")
            if len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY must be at least 32 characters in production"
                )
            if not self.DATABASE_URL:
                raise ValueError("DATABASE_URL is required in production")
            if self.database_backend() != "PostgreSQL":
                raise ValueError("DATABASE_URL must use PostgreSQL in production")
            origins = self.cors_origin_list()
            if not origins:
                raise ValueError("CORS_ORIGINS is required in production")
            if "*" in origins:
                raise ValueError("Wildcard CORS origins are not allowed in production")
            if not self.REDIS_URL:
                raise ValueError("REDIS_URL is required in production")
        if self.APP_ENV == "development":
            root_backend = _env_file_database_backend(canonical_env_file())
            if root_backend == "PostgreSQL" and self.database_backend() == "SQLite":
                raise ValueError(
                    "DATABASE_URL resolved to SQLite, but the repository-root .env "
                    "specifies PostgreSQL. Flask loads apps/api/.env into the process "
                    "environment. Start the API with FLASK_SKIP_DOTENV=1 or remove "
                    "apps/api/.env so the API and worker share one database."
                )
        return self

    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()
        ]

    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    def is_testing(self) -> bool:
        return self.APP_ENV == "testing"

    def upload_root_path(self) -> Path:
        path = Path(self.UPLOAD_ROOT)
        if not path.is_absolute():
            path = Path.cwd() / path
        return path.resolve()

    def database_backend(self) -> str:
        if not self.DATABASE_URL.strip():
            return "unconfigured"
        backend = make_url(self.DATABASE_URL).get_backend_name()
        if backend == "postgresql":
            return "PostgreSQL"
        if backend == "sqlite":
            return "SQLite"
        return backend

    def database_identity(self) -> str:
        """Host/database identity without credentials."""
        if not self.DATABASE_URL.strip():
            return "unconfigured"
        parsed = make_url(self.DATABASE_URL)
        backend = parsed.get_backend_name()
        if backend == "sqlite":
            return f"sqlite:{parsed.database or ':memory:'}"
        host = parsed.host or "localhost"
        port = parsed.port or 5432
        name = parsed.database or ""
        return f"{backend}://{host}:{port}/{name}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    _prefer_canonical_database_url()
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
