"""Health and readiness HTTP endpoints."""

from __future__ import annotations

from flask import Blueprint, current_app

from facilio.core.errors import AppError
from facilio.core.responses import success_response
from facilio.db.session import Database
from facilio.repositories.database_probe import DatabaseProbeRepository
from facilio.services.health import HealthService


def _service() -> HealthService:
    settings = current_app.config["FACILIO_SETTINGS"]
    database: Database = current_app.extensions["database"]
    queue = current_app.extensions.get("job_queue")
    return HealthService(settings, DatabaseProbeRepository(database), queue)


def register(blueprint: Blueprint) -> None:
    @blueprint.get("/health")
    def health():
        payload = _service().health()
        return success_response(payload.model_dump())

    @blueprint.get("/readiness")
    def readiness():
        payload = _service().readiness()
        body = payload.model_dump()
        if payload.status != "ready":
            raise AppError(
                "NOT_READY",
                "One or more dependencies are not ready.",
                status_code=503,
                details=body,
            )
        return success_response(body)
