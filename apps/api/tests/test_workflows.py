"""Workflow catalog, validation, preview, execution, and run tests."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pytest

from facilio.app import create_app
from facilio.db.base import Base
from facilio.db.session import Database
from facilio.services.job_executor import JobExecutor
from tests.conftest import make_settings

CUSTOMERS = (
    b"customer_name,status,lifetime_value,city\n"
    b" Alice Johnson ,ACTIVE,120,Paris\n"
    b"Kate Martin,active,,Lyon\n"
    b" Alice Johnson ,ACTIVE,120,Paris\n"
)


def _upload(client, filename: str, content: bytes):
    return client.post(
        "/api/v1/datasets",
        data={"file": (BytesIO(content), filename)},
        content_type="multipart/form-data",
    )


@pytest.fixture
def client(tmp_path: Path):
    settings = make_settings(
        DATABASE_URL=f"sqlite:///{tmp_path / 'facilio.db'}",
        UPLOAD_ROOT=str(tmp_path / "uploads"),
        MAX_UPLOAD_SIZE_MB=1,
        MAX_CONTENT_LENGTH=3 * 1024 * 1024,
    )
    app = create_app(settings)
    database: Database = app.extensions["database"]
    assert database.engine is not None
    Base.metadata.create_all(database.engine)
    yield app.test_client()
    database.engine.dispose()


def _execute_job(client, job_id: str) -> None:
    app = client.application
    JobExecutor(app.config["FACILIO_SETTINGS"], app.extensions["database"]).execute(
        job_id
    )


def _run_and_execute(client, workflow_id: str, dataset_id: str, version_id: str):
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={"dataset_id": dataset_id, "version_id": version_id},
    )
    assert response.status_code == 202, response.get_json()
    payload = response.get_json()["data"]
    assert payload["job"]["status"] == "QUEUED"
    assert payload["workflow_run"]["status"] == "QUEUED"
    _execute_job(client, payload["job"]["id"])
    job = client.get(f"/api/v1/jobs/{payload['job']['id']}").get_json()["data"]
    run = client.get(
        f"/api/v1/workflow-runs/{payload['workflow_run']['id']}"
    ).get_json()["data"]
    return job, run


def _create_cleanup(client) -> dict:
    created = client.post(
        "/api/v1/workflows",
        json={
            "name": "Customer Data Cleanup",
            "description": "Trim, case, fill, dedupe",
        },
    )
    assert created.status_code == 201
    workflow_id = created.get_json()["data"]["id"]
    steps = [
        {
            "operation_code": "TRIM_WHITESPACE",
            "parameters": {"column": "customer_name"},
        },
        {
            "operation_code": "NORMALIZE_CASE",
            "parameters": {"column": "status", "mode": "lowercase"},
        },
        {
            "operation_code": "FILL_MISSING",
            "parameters": {"column": "lifetime_value", "strategy": "median"},
        },
        {"operation_code": "REMOVE_DUPLICATES", "parameters": {}},
    ]
    for step in steps:
        added = client.post(f"/api/v1/workflows/{workflow_id}/steps", json=step)
        assert added.status_code == 201
    detail = client.get(f"/api/v1/workflows/{workflow_id}")
    return detail.get_json()["data"]


def test_create_list_and_revision_on_steps(client) -> None:
    workflow = _create_cleanup(client)
    assert workflow["status"] == "READY"
    assert workflow["revision"] == 5
    assert workflow["enabled_step_count"] == 4
    listed = client.get("/api/v1/workflows")
    assert listed.status_code == 200
    assert listed.get_json()["data"]["total"] == 1


def test_reorder_keeps_stable_ids(client) -> None:
    workflow = _create_cleanup(client)
    ids = [item["id"] for item in workflow["steps"]]
    reordered = [ids[3], ids[0], ids[1], ids[2]]
    response = client.post(
        f"/api/v1/workflows/{workflow['id']}/steps/reorder",
        json={"step_ids": reordered, "expected_revision": workflow["revision"]},
    )
    assert response.status_code == 200
    body = response.get_json()["data"]
    assert [item["id"] for item in body["steps"]] == reordered
    assert body["revision"] == workflow["revision"] + 1


def test_conflict_rejects_stale_revision(client) -> None:
    workflow = _create_cleanup(client)
    response = client.patch(
        f"/api/v1/workflows/{workflow['id']}",
        json={"name": "Other", "expected_revision": 1},
    )
    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "WORKFLOW_CONFLICT"


def test_disable_and_validation_schema_propagation(client) -> None:
    workflow = _create_cleanup(client)
    uploaded = _upload(client, "customers.csv", CUSTOMERS)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    rename = client.post(
        f"/api/v1/workflows/{workflow['id']}/steps",
        json={
            "operation_code": "RENAME_COLUMN",
            "parameters": {"column": "city", "new_name": "metro"},
        },
    )
    assert rename.status_code == 201
    trim_old = client.post(
        f"/api/v1/workflows/{workflow['id']}/steps",
        json={"operation_code": "TRIM_WHITESPACE", "parameters": {"column": "city"}},
    )
    assert trim_old.status_code == 201
    invalid = client.post(
        f"/api/v1/workflows/{workflow['id']}/validate",
        json={"dataset_id": dataset_id, "version_id": version_id},
    )
    assert invalid.status_code == 200
    assert invalid.get_json()["data"]["valid"] is False
    step_id = trim_old.get_json()["data"]["steps"][-1]["id"]
    disabled = client.patch(
        f"/api/v1/workflows/{workflow['id']}/steps/{step_id}",
        json={"enabled": False},
    )
    assert disabled.status_code == 200
    valid = client.post(
        f"/api/v1/workflows/{workflow['id']}/validate",
        json={"dataset_id": dataset_id, "version_id": version_id},
    )
    assert valid.get_json()["data"]["valid"] is True


def test_preview_does_not_persist_and_reports_impacts(client) -> None:
    workflow = _create_cleanup(client)
    uploaded = _upload(client, "customers.csv", CUSTOMERS)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    preview = client.post(
        f"/api/v1/workflows/{workflow['id']}/preview",
        json={"dataset_id": dataset_id, "version_id": version_id},
    )
    assert preview.status_code == 200
    body = preview.get_json()["data"]
    assert body["no_op"] is False
    assert body["rows_before"] == 3
    assert body["rows_after"] == 2
    assert len(body["steps"]) == 4
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions")
    assert len(versions.get_json()["data"]) == 1


def test_run_creates_one_version_and_preserves_original(client, tmp_path: Path) -> None:
    workflow = _create_cleanup(client)
    uploaded = _upload(client, "customers.csv", CUSTOMERS)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    job, payload = _run_and_execute(client, workflow["id"], dataset_id, version_id)
    assert job["status"] == "SUCCEEDED"
    assert payload["status"] == "SUCCEEDED"
    assert payload["output_version_number"] == 2
    assert payload["input_version_number"] == 1
    assert len(payload["step_runs"]) == 4
    assert all(item["status"] == "SUCCEEDED" for item in payload["step_runs"])
    assert job["progress"]["current"] == 4
    assert job["progress"]["total"] == 4
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 2
    derived = next(item for item in versions if item["version_number"] == 2)
    assert derived["created_by_workflow_run_id"] == payload["id"]
    assert derived["is_current"] is True
    originals = list((tmp_path / "uploads").glob("*/source.csv"))
    assert originals
    assert originals[0].read_bytes() == CUSTOMERS
    v1 = client.get(f"/api/v1/datasets/{dataset_id}/versions/{version_id}/preview")
    rows = v1.get_json()["data"]["rows"]
    assert rows[0][0] == " Alice Johnson "
    assert rows[0][1] == "ACTIVE"


def test_run_failure_skips_later_and_creates_no_version(client) -> None:
    created = client.post("/api/v1/workflows", json={"name": "Cast fail"})
    workflow_id = created.get_json()["data"]["id"]
    client.post(
        f"/api/v1/workflows/{workflow_id}/steps",
        json={"operation_code": "TRIM_WHITESPACE", "parameters": {"column": "keep"}},
    )
    client.post(
        f"/api/v1/workflows/{workflow_id}/steps",
        json={
            "operation_code": "CAST_TYPE",
            "parameters": {"column": "amount", "target_type": "INTEGER"},
        },
    )
    client.post(
        f"/api/v1/workflows/{workflow_id}/steps",
        json={"operation_code": "DROP_COLUMN", "parameters": {"column": "keep"}},
    )
    uploaded = _upload(client, "bad.csv", b"amount,keep\nx,yes\ny,no\n")
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    job, payload = _run_and_execute(client, workflow_id, dataset_id, version_id)
    assert job["status"] == "FAILED"
    assert payload["status"] == "FAILED"
    assert payload["output_version_id"] is None
    assert [item["status"] for item in payload["step_runs"]] == [
        "SUCCEEDED",
        "FAILED",
        "SKIPPED",
    ]
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 1
    assert versions[0]["is_current"] is True


def test_branching_two_runs_from_v1(client) -> None:
    workflow = _create_cleanup(client)
    uploaded = _upload(client, "customers.csv", CUSTOMERS)
    dataset_id = uploaded.get_json()["data"]["id"]
    v1 = uploaded.get_json()["data"]["current_version_id"]
    first_job, first = _run_and_execute(client, workflow["id"], dataset_id, v1)
    second_job, second = _run_and_execute(client, workflow["id"], dataset_id, v1)
    assert first_job["status"] == "SUCCEEDED"
    assert second_job["status"] == "SUCCEEDED"
    assert first["status"] == "SUCCEEDED"
    assert second["status"] == "SUCCEEDED"
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    numbers = sorted(item["version_number"] for item in versions)
    assert numbers == [1, 2, 3]
    parents = {
        item["version_number"]: item["parent_version_id"]
        for item in versions
        if item["kind"] == "DERIVED"
    }
    assert parents[2] == v1
    assert parents[3] == v1


def test_historical_snapshot_survives_edit_and_archive(client) -> None:
    workflow = _create_cleanup(client)
    uploaded = _upload(client, "customers.csv", CUSTOMERS)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    _job, run = _run_and_execute(client, workflow["id"], dataset_id, version_id)
    run_id = run["id"]
    revision = run["workflow_revision"]
    client.post(
        f"/api/v1/workflows/{workflow['id']}/steps",
        json={"operation_code": "DROP_COLUMN", "parameters": {"column": "city"}},
    )
    client.post(f"/api/v1/workflows/{workflow['id']}/archive")
    detail = client.get(f"/api/v1/workflow-runs/{run_id}")
    assert detail.status_code == 200
    body = detail.get_json()["data"]
    assert body["workflow_revision"] == revision
    assert len(body["workflow_snapshot"]["steps"]) == 4
    listed = client.get("/api/v1/workflows")
    assert listed.get_json()["data"]["total"] == 0
    archived = client.get("/api/v1/workflows?include_archived=true")
    assert archived.get_json()["data"]["total"] == 1


def test_duplicate_does_not_copy_runs(client) -> None:
    workflow = _create_cleanup(client)
    uploaded = _upload(client, "customers.csv", CUSTOMERS)
    _run_and_execute(
        client,
        workflow["id"],
        uploaded.get_json()["data"]["id"],
        uploaded.get_json()["data"]["current_version_id"],
    )
    copy = client.post(f"/api/v1/workflows/{workflow['id']}/duplicate")
    assert copy.status_code == 201
    body = copy.get_json()["data"]
    assert body["name"].endswith("— Copy")
    assert body["revision"] == 1
    assert len(body["steps"]) == 4
    runs = client.get(f"/api/v1/workflow-runs?workflow_id={body['id']}")
    assert runs.get_json()["data"]["total"] == 0


def test_incompatible_dataset_and_noop(client) -> None:
    workflow = _create_cleanup(client)
    other = _upload(client, "other.csv", b"sku,price\nA,1\n")
    dataset_id = other.get_json()["data"]["id"]
    version_id = other.get_json()["data"]["current_version_id"]
    invalid = client.post(
        f"/api/v1/workflows/{workflow['id']}/runs",
        json={"dataset_id": dataset_id, "version_id": version_id},
    )
    assert invalid.status_code == 400
    assert invalid.get_json()["error"]["code"] == "WORKFLOW_INCOMPATIBLE"
    empty = client.post("/api/v1/workflows", json={"name": "Empty"})
    client.post(
        f"/api/v1/workflows/{empty.get_json()['data']['id']}/steps",
        json={"operation_code": "TRIM_WHITESPACE", "parameters": {"column": "sku"}},
    )
    preview = client.post(
        f"/api/v1/workflows/{empty.get_json()['data']['id']}/preview",
        json={"dataset_id": dataset_id, "version_id": version_id},
    )
    assert preview.status_code == 200
    assert preview.get_json()["data"]["no_op"] is True
    dispatched = client.post(
        f"/api/v1/workflows/{empty.get_json()['data']['id']}/runs",
        json={"dataset_id": dataset_id, "version_id": version_id},
    )
    assert dispatched.status_code == 202
    job_id = dispatched.get_json()["data"]["job"]["id"]
    _execute_job(client, job_id)
    job = client.get(f"/api/v1/jobs/{job_id}").get_json()["data"]
    assert job["status"] == "FAILED"
    assert job["error_code"] == "WORKFLOW_NOOP"
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 1


def test_run_list_filters_and_workspace_summary(client) -> None:
    workflow = _create_cleanup(client)
    uploaded = _upload(client, "customers.csv", CUSTOMERS)
    _run_and_execute(
        client,
        workflow["id"],
        uploaded.get_json()["data"]["id"],
        uploaded.get_json()["data"]["current_version_id"],
    )
    listed = client.get(
        f"/api/v1/workflow-runs?workflow_id={workflow['id']}&status=SUCCEEDED"
    )
    assert listed.get_json()["data"]["total"] == 1
    summary = client.get("/api/v1/workspace/summary")
    data = summary.get_json()["data"]
    assert data["workflow_count"] == 1
    assert data["successful_run_count"] == 1
    assert data["derived_versions"] == 1


def test_unsupported_operation_rejected(client) -> None:
    created = client.post("/api/v1/workflows", json={"name": "Bad"})
    response = client.post(
        f"/api/v1/workflows/{created.get_json()['data']['id']}/steps",
        json={"operation_code": "EVAL_USER_CODE", "parameters": {}},
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "UNSUPPORTED_TRANSFORMATION"
