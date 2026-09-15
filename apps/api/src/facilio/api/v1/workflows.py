"""Workflow catalog, validation, preview, execution, and run inspection."""

from __future__ import annotations

from flask import Blueprint, current_app, request

from facilio.core.responses import success_response
from facilio.db.session import Database
from facilio.schemas.workflows import (
    CreateStepRequest,
    CreateWorkflowRequest,
    PatchStepRequest,
    PatchWorkflowRequest,
    ReorderStepsRequest,
    WorkflowInputRequest,
)
from facilio.services.workflows import WorkflowService


def _service() -> WorkflowService:
    settings = current_app.config["FACILIO_SETTINGS"]
    database: Database = current_app.extensions["database"]
    queue = current_app.extensions["job_queue"]
    return WorkflowService(settings, database, queue)


def register(blueprint: Blueprint) -> None:
    @blueprint.get("/workflows")
    def list_workflows():
        page = request.args.get("page", default=1, type=int) or 1
        page_size = request.args.get("page_size", default=20, type=int) or 20
        include = request.args.get("include_archived", default="false")
        payload = _service().list_workflows(
            page=page,
            page_size=page_size,
            include_archived=str(include).lower() in {"1", "true", "yes"},
        )
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/workflows")
    def create_workflow():
        body = CreateWorkflowRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().create_workflow(body)
        return success_response(payload.model_dump(mode="json"), status_code=201)

    @blueprint.get("/workflows/<workflow_id>")
    def get_workflow(workflow_id: str):
        payload = _service().get_workflow(workflow_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.patch("/workflows/<workflow_id>")
    def patch_workflow(workflow_id: str):
        body = PatchWorkflowRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().patch_workflow(workflow_id, body)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.delete("/workflows/<workflow_id>")
    def delete_workflow(workflow_id: str):
        payload = _service().delete_workflow(workflow_id)
        return success_response(payload)

    @blueprint.post("/workflows/<workflow_id>/archive")
    def archive_workflow(workflow_id: str):
        payload = _service().archive_workflow(workflow_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/workflows/<workflow_id>/restore")
    def restore_workflow(workflow_id: str):
        payload = _service().restore_workflow(workflow_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/workflows/<workflow_id>/duplicate")
    def duplicate_workflow(workflow_id: str):
        payload = _service().duplicate_workflow(workflow_id)
        return success_response(payload.model_dump(mode="json"), status_code=201)

    @blueprint.post("/workflows/<workflow_id>/steps")
    def add_step(workflow_id: str):
        body = CreateStepRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().add_step(workflow_id, body)
        return success_response(payload.model_dump(mode="json"), status_code=201)

    @blueprint.patch("/workflows/<workflow_id>/steps/<step_id>")
    def patch_step(workflow_id: str, step_id: str):
        body = PatchStepRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().patch_step(workflow_id, step_id, body)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.delete("/workflows/<workflow_id>/steps/<step_id>")
    def delete_step(workflow_id: str, step_id: str):
        payload = _service().delete_step(workflow_id, step_id)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/workflows/<workflow_id>/steps/reorder")
    def reorder_steps(workflow_id: str):
        body = ReorderStepsRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().reorder_steps(workflow_id, body)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/workflows/<workflow_id>/validate")
    def validate_workflow(workflow_id: str):
        raw = request.get_json(silent=True) or {}
        body = None
        if raw.get("dataset_id") and raw.get("version_id"):
            body = WorkflowInputRequest.model_validate(raw)
        payload = _service().validate(workflow_id, body)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/workflows/<workflow_id>/preview")
    def preview_workflow(workflow_id: str):
        body = WorkflowInputRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().preview(workflow_id, body)
        return success_response(payload.model_dump(mode="json"))

    @blueprint.post("/workflows/<workflow_id>/runs")
    def run_workflow(workflow_id: str):
        body = WorkflowInputRequest.model_validate(request.get_json(silent=True) or {})
        payload = _service().run(workflow_id, body)
        return success_response(payload.model_dump(mode="json"), status_code=202)

    @blueprint.get("/workflow-runs")
    def list_runs():
        page = request.args.get("page", default=1, type=int) or 1
        page_size = request.args.get("page_size", default=20, type=int) or 20
        payload = _service().list_runs(
            page=page,
            page_size=page_size,
            workflow_id=request.args.get("workflow_id"),
            dataset_id=request.args.get("dataset_id"),
            status=request.args.get("status"),
        )
        return success_response(payload.model_dump(mode="json"))

    @blueprint.get("/workflow-runs/<run_id>")
    def get_run(run_id: str):
        payload = _service().get_run(run_id)
        return success_response(payload.model_dump(mode="json"))
