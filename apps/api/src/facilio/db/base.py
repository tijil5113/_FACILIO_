"""SQLAlchemy declarative base for future FACILIO models."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared metadata registry for all persistence models."""
