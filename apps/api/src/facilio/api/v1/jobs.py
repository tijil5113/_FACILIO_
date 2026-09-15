"""Job catalog, cancel, retry, and operational health."""

from __future__ import annotations

from flask import Blueprint, current_app, request

from facilio.core.responses import success_response
from facilio.db.session import Database
from facilio.services.jobs import JobService


def _service() -> JobService:
    settings = current_app.config["FACILIO_SETTINGS"]
    database: Database = current_app.extensions["database"]
    queue = current_app.extensions["job_queue"]
    return JobService(settings, database, queue)


def register(blueprint: Blueprint) -> None:
    @blueprint.get("/jobs")
    def list_jobs():
        page = request.args.get("page", default=1, type=int) or 1
        page_size = request.args.get("page_size", default=20, type=int) or 20
        payload = _service().list_jobs(
            page=page,
            page_size=page_size,
            status=request.args.get("status"),
            job_type=request.args.get("job_type"),
            workflow_id=request.args.get("workflow_id"),
            dataset_id=request.args.get("dataset_id"),
            search=request.args.get("q"),
        )
        return success_response(payload.model_dump(mode="json"))

    @blueprint.get("/jobs/<job_id>")
    def get_job(job_id: str):
        payload = _service().get_job(job_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/jobs/<job_id>/cancel")
    def cancel_job(job_id: str):
        payload = _service().cancel(job_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/jobs/<job_id>/retry")
    def retry_job(job_id: str):
        payload = _service().retry(job_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.get("/operations/health")
    def operations_health():
        payload = _service().operations_health()
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/operations/recover")
    def recover_stale():
        recovered = _service().recover_stale()
        return success_response({"recovered": recovered})
