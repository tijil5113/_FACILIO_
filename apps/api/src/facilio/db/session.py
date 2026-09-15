"""SQLAlchemy engine and session factory."""

from __future__ import annotations

from collections.abc import Generator, Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker

from facilio.core.config import Settings
from facilio.core.errors import DatabaseNotConfiguredError, DatabaseUnavailableError
from facilio.core.logging import get_logger

logger = get_logger("facilio.db")


class Database:
    """Owns the process-wide engine and session factory."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.engine: Engine | None = None
        self.session_factory: sessionmaker[Session] | None = None
        if settings.DATABASE_URL:
            self._configure_engine(settings.DATABASE_URL)

    def _configure_engine(self, url: str) -> None:
        parsed = make_url(url)
        connect_args: dict[str, object] = {}
        if parsed.drivername.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        elif parsed.drivername.startswith("postgresql"):
            connect_args["connect_timeout"] = 2

        self.engine = create_engine(
            url,
            pool_pre_ping=True,
            future=True,
            connect_args=connect_args,
        )
        self.session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            future=True,
        )
        logger.info("Database engine configured (driver=%s)", parsed.drivername)

    def is_configured(self) -> bool:
        return self.engine is not None

    @contextmanager
    def session_scope(self) -> Iterator[Session]:
        if self.session_factory is None:
            raise DatabaseNotConfiguredError
        db_session = self.session_factory()
        try:
            yield db_session
            db_session.commit()
        except Exception:
            db_session.rollback()
            raise
        finally:
            db_session.close()

    def session(self) -> Generator[Session, None, None]:
        if self.session_factory is None:
            raise DatabaseNotConfiguredError
        db_session = self.session_factory()
        try:
            yield db_session
        finally:
            db_session.close()

    def probe(self) -> None:
        if self.engine is None:
            raise DatabaseNotConfiguredError
        try:
            with self.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
        except DatabaseNotConfiguredError:
            raise
        except Exception:
            logger.warning("Database readiness probe failed")
            raise DatabaseUnavailableError from None
