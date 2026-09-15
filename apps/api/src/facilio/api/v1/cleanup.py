"""Guided Cleanup HTTP endpoints."""

from __future__ import annotations

from flask import Blueprint, current_app, request

from facilio.core.responses import success_response
from facilio.db.session import Database
from facilio.schemas.cleanup import CleanupApplyRequest, CleanupPreviewRequest
from facilio.services.cleanup import CleanupService


def _service() -> CleanupService:
    settings = current_app.config["FACILIO_SETTINGS"]
    database: Database = current_app.extensions["database"]
    return CleanupService(settings, database)


def register(blueprint: Blueprint) -> None:
    @blueprint.get(
        "/datasets/<dataset_id>/versions/<version_id>/cleanup-recommendations"
    )
    def cleanup_recommendations(dataset_id: str, version_id: str):
        payload = _service().recommendations(dataset_id, version_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/datasets/<dataset_id>/versions/<version_id>/cleanup-preview")
    def cleanup_preview(dataset_id: str, version_id: str):
        body = CleanupPreviewRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().preview(dataset_id, version_id, body)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/datasets/<dataset_id>/versions/<version_id>/cleanup")
    def cleanup_apply(dataset_id: str, version_id: str):
        body = CleanupApplyRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().apply(dataset_id, version_id, body)
        return success_response(payload.model_dump(mode="json"), status_code=201)
