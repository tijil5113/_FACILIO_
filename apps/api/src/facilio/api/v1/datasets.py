"""Dataset HTTP endpoints."""

from __future__ import annotations

from flask import Blueprint, current_app, request

from facilio.core.responses import success_response
from facilio.db.session import Database
from facilio.schemas.datasets import RenameDatasetRequest
from facilio.services.datasets import DatasetService


def _service() -> DatasetService:
    settings = current_app.config["FACILIO_SETTINGS"]
    database: Database = current_app.extensions["database"]
    return DatasetService(settings, database)


def register(blueprint: Blueprint) -> None:
    @blueprint.get("/datasets")
    def list_datasets():
        page = request.args.get("page", default=1, type=int) or 1
        page_size = request.args.get("page_size", default=20, type=int) or 20
        payload = _service().list_datasets(page=page, page_size=page_size)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/datasets")
    def create_dataset():
        upload = request.files.get("file")
        sheet = request.form.get("sheet") or None
        staging_id = request.form.get("staging_id") or None
        if request.is_json and request.get_json(silent=True):
            body = request.get_json(silent=True) or {}
            sheet = body.get("sheet") or sheet
            staging_id = body.get("staging_id") or staging_id
        result = _service().create_from_upload(
            upload, sheet=sheet, staging_id=staging_id
        )
        return success_response(result.model_dump(mode="json"), status_code=201)

    @blueprint.get("/datasets/<dataset_id>")
    def get_dataset(dataset_id: str):
        payload = _service().get_dataset(dataset_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.patch("/datasets/<dataset_id>")
    def rename_dataset(dataset_id: str):
        payload = RenameDatasetRequest.model_validate(
            request.get_json(silent=True) or {}
        )
        updated = _service().rename(dataset_id, payload.name)
        return success_response(updated.model_dump(mode="json"))

    @blueprint.delete("/datasets/<dataset_id>")
    def delete_dataset(dataset_id: str):
        _service().delete(dataset_id)
        return success_response({"id": dataset_id, "deleted": True})

    @blueprint.get("/datasets/<dataset_id>/preview")
    def preview_dataset(dataset_id: str):
        payload = _service().preview(dataset_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/datasets/<dataset_id>/profile")
    def create_profile(dataset_id: str):
        from facilio.services.profiles import ProfileService

        payload = ProfileService(
            current_app.config["FACILIO_SETTINGS"],
            current_app.extensions["database"],
        ).run_profile(dataset_id, request.args.get("version"))
        return success_response(payload.model_dump(mode="json"))

    @blueprint.get("/datasets/<dataset_id>/profile")
    def get_profile(dataset_id: str):
        from facilio.services.profiles import ProfileService

        payload = ProfileService(
            current_app.config["FACILIO_SETTINGS"],
            current_app.extensions["database"],
        ).get_profile(dataset_id, request.args.get("version"))
        return success_response(payload.model_dump(mode="json"))

    @blueprint.get("/datasets/<dataset_id>/quality")
    def get_quality(dataset_id: str):
        from facilio.services.profiles import ProfileService

        payload = ProfileService(
            current_app.config["FACILIO_SETTINGS"],
            current_app.extensions["database"],
        ).get_quality(dataset_id, request.args.get("version"))
        return success_response(payload.model_dump(mode="json"))

    @blueprint.get("/datasets/<dataset_id>/issues")
    def list_issues(dataset_id: str):
        from facilio.services.profiles import ProfileService

        page = request.args.get("page", default=1, type=int) or 1
        page_size = request.args.get("page_size", default=20, type=int) or 20
        payload = ProfileService(
            current_app.config["FACILIO_SETTINGS"],
            current_app.extensions["database"],
        ).list_issues(
            dataset_id,
            page=page,
            page_size=page_size,
            severity=request.args.get("severity"),
            category=request.args.get("category"),
            column=request.args.get("column"),
            version_id=request.args.get("version"),
        )
        return success_response(payload.model_dump(mode="json"))
