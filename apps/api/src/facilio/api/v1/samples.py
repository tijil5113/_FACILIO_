"""Allowlisted sample import endpoints."""

from __future__ import annotations

from flask import Blueprint, current_app

from facilio.core.responses import success_response
from facilio.db.session import Database
from facilio.services.samples import SampleService


def _service() -> SampleService:
    settings = current_app.config["FACILIO_SETTINGS"]
    database: Database = current_app.extensions["database"]
    return SampleService(settings, database)


def register(blueprint: Blueprint) -> None:
    @blueprint.post("/samples/<sample_id>/import")
    def import_sample(sample_id: str):
        payload, created = _service().import_sample(sample_id)
        return success_response(
            payload.model_dump(mode="json"),
            status_code=201 if created else 200,
        )
