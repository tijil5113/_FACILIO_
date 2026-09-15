"""Readiness probe against the configured database."""

from __future__ import annotations

from facilio.db.session import Database


class DatabaseProbeRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def probe(self) -> None:
        self._database.probe()
