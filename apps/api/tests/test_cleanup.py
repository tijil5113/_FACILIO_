"""Guided Cleanup recommendation, preview, apply, and save-as-cleanup tests."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from facilio.app import create_app
from facilio.db.base import Base
from facilio.db.session import Database
from tests.conftest import make_settings

CUSTOMERS = (
    b"customer_name,status,lifetime_value,city\n"
    b" Alice Johnson ,ACTIVE,120,Paris\n"
    b"Kate Martin,active,,Lyon\n"
    b" Alice Johnson ,ACTIVE,120,Paris\n"
)

CLEAN_ALICE = b"name\nAlice\nBob\n"


def _client(tmp_path: Path):
    settings = make_settings(
        DATABASE_URL=f"sqlite:///{tmp_path / 'cleanup.db'}",
        UPLOAD_ROOT=str(tmp_path / "uploads"),
    )
    app = create_app(settings)
    database: Database = app.extensions["database"]
    assert database.engine is not None
    Base.metadata.create_all(database.engine)
    return app.test_client()


def _upload(client, content: bytes = CUSTOMERS, name: str = "customers.csv"):
    return client.post(
        "/api/v1/datasets",
        data={"file": (BytesIO(content), name)},
        content_type="multipart/form-data",
    )


def _ready(client, dataset_id: str, version_id: str):
    profiled = client.post(
        f"/api/v1/datasets/{dataset_id}/profile?version={version_id}"
    )
    assert profiled.status_code == 200, profiled.get_json()
    return profiled.get_json()["data"]


def _plan(steps: list[dict]) -> list[dict]:
    return [
        {
            "recommendation_id": item.get("recommendation_id"),
            "operation_code": item["operation_code"],
            "parameters": item["parameters"],
        }
        for item in steps
    ]


def test_recommendations_map_registered_operations(tmp_path: Path) -> None:
    client = _client(tmp_path)
    uploaded = _upload(client)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    _ready(client, dataset_id, version_id)
    response = client.get(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-recommendations"
    )
    assert response.status_code == 200, response.get_json()
    payload = response.get_json()["data"]
    assert payload["actionable_count"] >= 4
    by_code = {item["issue_code"]: item for item in payload["recommendations"]}
    assert by_code["LEADING_TRAILING_WHITESPACE"]["operation_code"] == "TRIM_WHITESPACE"
    assert by_code["CASE_VARIATION"]["default_parameters"]["mode"] == "lowercase"
    assert by_code["MISSING_VALUES"]["operation_code"] == "FILL_MISSING"
    assert by_code["DUPLICATE_ROWS"]["kind"] == "actionable"
    assert by_code["DUPLICATE_ROWS"]["preselected"] is False
    again = client.get(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-recommendations"
    ).get_json()["data"]
    assert again["recommendations"] == payload["recommendations"]


def test_composed_preview_does_not_persist_and_uses_intermediate(
    tmp_path: Path,
) -> None:
    client = _client(tmp_path)
    uploaded = _upload(client)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    _ready(client, dataset_id, version_id)
    response = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-preview",
        json={
            "steps": [
                {
                    "operation_code": "TRIM_WHITESPACE",
                    "parameters": {"column": "customer_name"},
                },
                {
                    "operation_code": "NORMALIZE_CASE",
                    "parameters": {"column": "customer_name", "mode": "lowercase"},
                },
            ]
        },
    )
    assert response.status_code == 200, response.get_json()
    payload = response.get_json()["data"]
    after_values = [
        item["after"]
        for item in payload["examples"]
        if item["column"] == "customer_name" and item["kind"] == "cell"
    ]
    assert "alice johnson" in [str(value).lower() for value in after_values]
    assert not any(str(value).startswith(" ") for value in after_values if value)
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 1
    assert payload["no_op"] is False


def test_conflicts_rejected(tmp_path: Path) -> None:
    client = _client(tmp_path)
    uploaded = _upload(client)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    _ready(client, dataset_id, version_id)
    response = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-preview",
        json={
            "steps": [
                {
                    "operation_code": "NORMALIZE_CASE",
                    "parameters": {"column": "status", "mode": "lowercase"},
                },
                {
                    "operation_code": "NORMALIZE_CASE",
                    "parameters": {"column": "status", "mode": "uppercase"},
                },
            ]
        },
    )
    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "CLEANUP_CONFLICT"


def test_unknown_operation_rejected(tmp_path: Path) -> None:
    client = _client(tmp_path)
    uploaded = _upload(client)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    _ready(client, dataset_id, version_id)
    response = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-preview",
        json={"steps": [{"operation_code": "eval", "parameters": {}}]},
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "UNSUPPORTED_TRANSFORMATION"


def test_noop_cannot_apply(tmp_path: Path) -> None:
    client = _client(tmp_path)
    uploaded = _upload(client, CLEAN_ALICE, "clean.csv")
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    _ready(client, dataset_id, version_id)
    preview = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-preview",
        json={
            "steps": [
                {"operation_code": "TRIM_WHITESPACE", "parameters": {"column": "name"}}
            ]
        },
    ).get_json()["data"]
    assert preview["no_op"] is True
    apply = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup",
        json={
            "steps": [
                {"operation_code": "TRIM_WHITESPACE", "parameters": {"column": "name"}}
            ],
            "plan_fingerprint": preview["plan_fingerprint"],
        },
    )
    assert apply.status_code == 409
    assert apply.get_json()["error"]["code"] == "CLEANUP_NOOP"
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 1


def test_stale_preview_rejected(tmp_path: Path) -> None:
    client = _client(tmp_path)
    uploaded = _upload(client)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    _ready(client, dataset_id, version_id)
    preview = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-preview",
        json={
            "steps": [
                {
                    "operation_code": "TRIM_WHITESPACE",
                    "parameters": {"column": "customer_name"},
                }
            ]
        },
    ).get_json()["data"]
    apply = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup",
        json={
            "steps": [
                {
                    "operation_code": "TRIM_WHITESPACE",
                    "parameters": {"column": "customer_name"},
                }
            ],
            "plan_fingerprint": "0" * 64,
        },
    )
    assert apply.status_code == 409
    assert apply.get_json()["error"]["code"] == "CLEANUP_STALE"
    assert preview["plan_fingerprint"] != "0" * 64


def test_one_output_version_and_quality_and_save(tmp_path: Path) -> None:
    client = _client(tmp_path)
    uploaded = _upload(client)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    _ready(client, dataset_id, version_id)
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
    preview = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-preview",
        json={"steps": steps},
    )
    assert preview.status_code == 200, preview.get_json()
    fingerprint = preview.get_json()["data"]["plan_fingerprint"]
    applied = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup",
        json={
            "steps": steps,
            "plan_fingerprint": fingerprint,
            "acknowledge_high_impact": True,
        },
    )
    assert applied.status_code == 201, applied.get_json()
    payload = applied.get_json()["data"]
    assert payload["output_version_number"] == 2
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert [item["version_number"] for item in versions] == [1, 2]
    original = next(item for item in versions if item["version_number"] == 1)
    cleaned = next(item for item in versions if item["version_number"] == 2)
    assert original["kind"] == "ORIGINAL"
    assert cleaned["parent_version_id"] == original["id"]
    assert cleaned["created_by_workflow_run_id"] == payload["workflow_run"]["id"]
    v1_preview = client.get(
        f"/api/v1/datasets/{dataset_id}/versions/{original['id']}/preview"
    ).get_json()["data"]
    assert any(
        isinstance(row[0], str) and row[0].startswith(" ") for row in v1_preview["rows"]
    )
    v2_preview = client.get(
        f"/api/v1/datasets/{dataset_id}/versions/{cleaned['id']}/preview"
    ).get_json()["data"]
    names = [row[0] for row in v2_preview["rows"]]
    assert "Alice Johnson" in names
    assert v2_preview["row_count"] == 2
    v1_quality = client.get(
        f"/api/v1/datasets/{dataset_id}/versions/{original['id']}/profile"
    ).get_json()["data"]
    v2_quality = client.get(
        f"/api/v1/datasets/{dataset_id}/versions/{cleaned['id']}/profile"
    ).get_json()["data"]
    assert v1_quality["status"] == "READY"
    assert v2_quality["status"] == "READY"
    assert payload["quality_delta"]["before"] == v1_quality["quality"]["overall_score"]
    assert payload["quality_delta"]["after"] == v2_quality["quality"]["overall_score"]
    jobs = client.get("/api/v1/jobs").get_json()["data"]["items"]
    assert jobs[0]["workflow_name"] == "Guided cleanup"
    saved = client.post(
        "/api/v1/workflows",
        json={
            "name": "Customer Data Cleanup",
            "description": "Save this cleanup and use it again on matching data.",
            "steps": steps,
        },
    )
    assert saved.status_code == 201, saved.get_json()
    workflow = saved.get_json()["data"]
    assert [item["operation_code"] for item in workflow["steps"]] == [
        "TRIM_WHITESPACE",
        "NORMALIZE_CASE",
        "FILL_MISSING",
        "REMOVE_DUPLICATES",
    ]
    validation = client.post(
        f"/api/v1/workflows/{workflow['id']}/validate",
        json={"dataset_id": dataset_id, "version_id": version_id},
    )
    assert validation.status_code == 200
    assert validation.get_json()["data"]["valid"] is True
    builder = client.get(f"/api/v1/workflows/{workflow['id']}")
    assert builder.status_code == 200
    assert builder.get_json()["data"]["revision"] == 1


def test_failure_atomicity(tmp_path: Path) -> None:
    client = _client(tmp_path)
    uploaded = _upload(client)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    _ready(client, dataset_id, version_id)
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
            "parameters": {"column": "city", "strategy": "median"},
        },
    ]
    preview = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-preview",
        json={"steps": steps},
    )
    assert preview.status_code == 400
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 1
    dataset = client.get(f"/api/v1/datasets/{dataset_id}").get_json()["data"]
    assert dataset["current_version_id"] == version_id


def test_sample_guided_cleanup(tmp_path: Path) -> None:
    client = _client(tmp_path)
    imported = client.post("/api/v1/samples/customers/import")
    assert imported.status_code == 201, imported.get_json()
    dataset = imported.get_json()["data"]
    dataset_id = dataset["id"]
    version_id = dataset["current_version_id"]
    _ready(client, dataset_id, version_id)
    recs = client.get(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-recommendations"
    ).get_json()["data"]["recommendations"]
    selected = []
    for item in recs:
        if item["kind"] != "actionable" or not item["applicable"]:
            continue
        if item["issue_code"] in {
            "LEADING_TRAILING_WHITESPACE",
            "CASE_VARIATION",
            "DUPLICATE_ROWS",
        } or (
            item["issue_code"] == "MISSING_VALUES"
            and item["columns"] == ["lifetime_value"]
        ):
            if item["columns"] == ["email"]:
                continue
            selected.append(
                {
                    "recommendation_id": item["recommendation_id"],
                    "operation_code": item["operation_code"],
                    "parameters": item["default_parameters"],
                }
            )
            if item["issue_code"] == "LEADING_TRAILING_WHITESPACE":
                # keep first whitespace column only for a compact plan
                pass
    # Prefer customer_name trim only.
    selected = [
        item
        for item in selected
        if not (
            item["operation_code"] == "TRIM_WHITESPACE"
            and item["parameters"].get("column") != "customer_name"
        )
    ]
    preview = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-preview",
        json={"steps": selected},
    )
    assert preview.status_code == 200, preview.get_json()
    applied = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup",
        json={
            "steps": selected,
            "plan_fingerprint": preview.get_json()["data"]["plan_fingerprint"],
            "acknowledge_high_impact": True,
        },
    )
    assert applied.status_code == 201, applied.get_json()
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 2


def test_apply_succeeds_when_output_profile_fails(tmp_path: Path, monkeypatch) -> None:
    client = _client(tmp_path)
    uploaded = _upload(client, CLEAN_ALICE, "alice.csv")
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    original = client.get(f"/api/v1/datasets/{dataset_id}/preview").get_json()["data"][
        "rows"
    ]
    _ready(client, dataset_id, version_id)
    from facilio.core.errors import AppError
    from facilio.services.profiles import ProfileService

    def fail_profile(self, dataset_id: str, version_id: str | None = None):
        raise AppError("PROFILING_FAILED", "injected profile failure", status_code=500)

    monkeypatch.setattr(ProfileService, "run_profile", fail_profile)
    steps = [
        {
            "operation_code": "NORMALIZE_CASE",
            "parameters": {"column": "name", "mode": "lowercase"},
        }
    ]
    preview = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-preview",
        json={"steps": steps},
    )
    assert preview.status_code == 200, preview.get_json()
    applied = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup",
        json={
            "steps": steps,
            "plan_fingerprint": preview.get_json()["data"]["plan_fingerprint"],
        },
    )
    assert applied.status_code == 201, applied.get_json()
    payload = applied.get_json()["data"]
    assert payload["output_version_number"] == 2
    assert payload["job"]["status"] == "SUCCEEDED"
    assert payload["profile_status"] == "FAILED"
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 2
    child = next(item for item in versions if item["version_number"] == 2)
    parent = next(item for item in versions if item["version_number"] == 1)
    assert child["profile_status"] == "FAILED"
    assert parent["profile_status"] == "READY"
    job = client.get(f"/api/v1/jobs/{payload['job']['id']}").get_json()["data"]
    assert job["status"] == "SUCCEEDED"
    assert job["output_version_number"] == 2
    assert job["output_profile_status"] == "FAILED"
    still_original = client.get(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/preview"
    ).get_json()["data"]["rows"]
    assert still_original == original


def test_apply_fails_before_output_creates_no_version(
    tmp_path: Path, monkeypatch
) -> None:
    client = _client(tmp_path)
    uploaded = _upload(client, CLEAN_ALICE, "alice.csv")
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    _ready(client, dataset_id, version_id)
    from facilio.core.errors import AppError

    def fail_pipeline(*_args, **_kwargs):
        raise AppError(
            "WORKFLOW_EXECUTION_FAILED",
            "injected transformation failure",
            status_code=400,
        )

    monkeypatch.setattr("facilio_processing.workflows.execute_pipeline", fail_pipeline)
    steps = [
        {
            "operation_code": "NORMALIZE_CASE",
            "parameters": {"column": "name", "mode": "lowercase"},
        }
    ]
    preview = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup-preview",
        json={"steps": steps},
    )
    assert preview.status_code == 200, preview.get_json()
    applied = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/cleanup",
        json={
            "steps": steps,
            "plan_fingerprint": preview.get_json()["data"]["plan_fingerprint"],
        },
    )
    assert applied.status_code == 400, applied.get_json()
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 1
    assert versions[0]["version_number"] == 1
