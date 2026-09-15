"""Transformation catalog, versions, preview, apply, and lineage."""

from __future__ import annotations

from flask import Blueprint, current_app, request

from facilio.core.responses import success_response
from facilio.db.session import Database
from facilio.schemas.transformations import (
    SetCurrentVersionRequest,
    TransformationRequest,
)
from facilio.services.profiles import ProfileService
from facilio.services.transformations import TransformationService


def _service() -> TransformationService:
    settings = current_app.config["FACILIO_SETTINGS"]
    database: Database = current_app.extensions["database"]
    return TransformationService(settings, database)


def _profiles() -> ProfileService:
    settings = current_app.config["FACILIO_SETTINGS"]
    database: Database = current_app.extensions["database"]
    return ProfileService(settings, database)


def register(blueprint: Blueprint) -> None:
    @blueprint.get("/transformations")
    def transformation_catalog():
        return success_response(_service().catalog())

    @blueprint.get("/workspace/summary")
    def workspace_summary():
        return success_response(_service().workspace_stats().model_dump(mode="json"))

    @blueprint.get("/datasets/<dataset_id>/versions")
    def list_versions(dataset_id: str):
        items = _service().list_versions(dataset_id)
        return success_response([item.model_dump(mode="json") for item in items])

    @blueprint.get("/datasets/<dataset_id>/versions/<version_id>")
    def get_version(dataset_id: str, version_id: str):
        payload = _service().get_version(dataset_id, version_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.get("/datasets/<dataset_id>/versions/<version_id>/preview")
    def preview_version(dataset_id: str, version_id: str):
        payload = _service().preview_version(dataset_id, version_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.get("/datasets/<dataset_id>/versions/<version_id>/profile")
    def get_version_profile(dataset_id: str, version_id: str):
        payload = _profiles().get_profile(dataset_id, version_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/datasets/<dataset_id>/versions/<version_id>/profile")
    def run_version_profile(dataset_id: str, version_id: str):
        payload = _profiles().run_profile(dataset_id, version_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.get("/datasets/<dataset_id>/versions/<version_id>/lineage")
    def lineage(dataset_id: str, version_id: str):
        payload = _service().lineage(dataset_id, version_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.get("/datasets/<dataset_id>/versions/<version_id>/comparison")
    def comparison(dataset_id: str, version_id: str):
        payload = _service().compare_with_parent(dataset_id, version_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post(
        "/datasets/<dataset_id>/versions/<version_id>/transformations/preview"
    )
    def preview_transformation(dataset_id: str, version_id: str):
        body = TransformationRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().preview_transformation(dataset_id, version_id, body)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/datasets/<dataset_id>/versions/<version_id>/transformations")
    def apply_transformation(dataset_id: str, version_id: str):
        body = TransformationRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().apply_transformation(dataset_id, version_id, body)
        return success_response(payload.model_dump(mode="json"), status_code=201)

    @blueprint.patch("/datasets/<dataset_id>/current-version")
    def set_current_version(dataset_id: str):
        body = SetCurrentVersionRequest.model_validate(
            request.get_json(silent=True) or {}
        )
        payload = _service().set_current_version(dataset_id, body)
        return success_response(payload.model_dump(mode="json"))
