"""Global data-quality summary endpoint."""

from __future__ import annotations

from flask import Blueprint, current_app

from facilio.core.responses import success_response
from facilio.services.profiles import ProfileService


def register(blueprint: Blueprint) -> None:
    @blueprint.get("/quality/summary")
    def quality_summary():
        settings = current_app.config["FACILIO_SETTINGS"]
        database = current_app.extensions["database"]
        payload = ProfileService(settings, database).overview()
        return success_response(payload.model_dump(mode="json"))
