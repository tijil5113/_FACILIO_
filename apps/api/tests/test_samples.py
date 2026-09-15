"""Allowlisted sample import tests using the real ingestion and profiler."""

from __future__ import annotations

from pathlib import Path

import pytest

from facilio.app import create_app
from facilio.core.errors import AppError
from facilio.db.base import Base
from facilio.db.session import Database
from facilio.services.samples import bundled_sample_path
from tests.conftest import make_settings

EXPECTED_ISSUE_CODES = {
    "DUPLICATE_ROWS",
    "LEADING_TRAILING_WHITESPACE",
    "CASE_VARIATION",
    "MISSING_VALUES",
    "MIXED_DATE_FORMATS",
}


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


def test_import_customer_sample_creates_original_dataset(client) -> None:
    response = client.post("/api/v1/samples/customers/import")
    assert response.status_code == 201
    body = response.get_json()
    assert body["success"] is True
    data = body["data"]
    assert data["is_sample"] is True
    assert data["sample_key"] == "CUSTOMER_CLEANUP"
    assert data["name"] == "Sample: Customer data"
    assert data["file_type"] == "csv"
    assert data["original_filename"] == "facilio-demo-customers.csv"
    assert data["status"] == "ready"
    assert data["current_version_number"] == 1
    assert data["version_count"] == 1
    assert data["row_count"] == 20
    assert data["column_count"] == 8
    assert "storage_key" not in data
    dataset_id = data["id"]

    preview = client.get(f"/api/v1/datasets/{dataset_id}/preview")
    assert preview.status_code == 200
    preview_data = preview.get_json()["data"]
    assert preview_data["row_count"] == 20
    assert preview_data["version_number"] == 1

    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions")
    assert versions.status_code == 200
    items = versions.get_json()["data"]
    assert len(items) == 1
    assert items[0]["kind"] == "ORIGINAL"
    assert items[0]["version_number"] == 1


def test_sample_import_is_idempotent(client) -> None:
    first = client.post("/api/v1/samples/customers/import")
    second = client.post("/api/v1/samples/CUSTOMER_CLEANUP/import")
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.get_json()["data"]["id"] == second.get_json()["data"]["id"]
    listed = client.get("/api/v1/datasets")
    assert listed.get_json()["data"]["total"] == 1


def test_invalid_sample_id_and_path_traversal_are_rejected(client) -> None:
    missing = client.post("/api/v1/samples/not-a-sample/import")
    assert missing.status_code == 404
    assert missing.get_json()["error"]["code"] == "SAMPLE_NOT_FOUND"

    traversal = client.post("/api/v1/samples/../customers/import")
    assert traversal.status_code in {404, 405}

    encoded = client.post("/api/v1/samples/%2e%2e%2fcustomers/import")
    assert encoded.status_code in {404, 405}

    absolute = client.post("/api/v1/samples//etc/passwd/import")
    assert absolute.status_code in {404, 405}


def test_sample_can_be_deleted_and_recreated(client) -> None:
    created = client.post("/api/v1/samples/customers/import")
    dataset_id = created.get_json()["data"]["id"]
    deleted = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert deleted.status_code == 200
    missing = client.get(f"/api/v1/datasets/{dataset_id}")
    assert missing.status_code == 404
    recreated = client.post("/api/v1/samples/customers/import")
    assert recreated.status_code == 201
    assert recreated.get_json()["data"]["id"] != dataset_id
    assert recreated.get_json()["data"]["is_sample"] is True


def test_demo_uses_real_profiler_signals(client) -> None:
    created = client.post("/api/v1/samples/customers/import")
    dataset_id = created.get_json()["data"]["id"]
    assert created.get_json()["data"]["profile_status"] == "NOT_PROFILED"

    profiled = client.post(f"/api/v1/datasets/{dataset_id}/profile")
    assert profiled.status_code == 200
    profile = profiled.get_json()["data"]
    assert profile["status"] == "READY"
    assert profile["summary"]["duplicate_rows"] == 1
    assert profile["quality"]["overall_score"] is not None

    issues = client.get(f"/api/v1/datasets/{dataset_id}/issues?page_size=50")
    assert issues.status_code == 200
    payload = issues.get_json()["data"]
    codes = {item["code"] for item in payload["items"]}
    assert codes >= EXPECTED_ISSUE_CODES
    columns_by_code = {item["code"]: item["column"] for item in payload["items"]}
    assert columns_by_code["LEADING_TRAILING_WHITESPACE"] in {
        "customer_name",
        "email",
    }
    assert any(
        item["code"] == "CASE_VARIATION" and item["column"] == "status"
        for item in payload["items"]
    )
    assert any(
        item["code"] == "MISSING_VALUES" and item["column"] == "lifetime_value"
        for item in payload["items"]
    )
    assert any(
        item["code"] == "MIXED_DATE_FORMATS" and item["column"] == "signup_date"
        for item in payload["items"]
    )

    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions")
    kinds = {item["kind"] for item in versions.get_json()["data"]}
    assert kinds == {"ORIGINAL"}

    listed = client.get("/api/v1/datasets")
    item = listed.get_json()["data"]["items"][0]
    assert item["issue_count"] == payload["total"]
    assert item["is_sample"] is True


def test_bundled_sample_path_rejects_user_filenames() -> None:
    with pytest.raises(AppError) as blocked:
        bundled_sample_path("../facilio-demo-customers.csv")
    assert blocked.value.code == "SAMPLE_NOT_FOUND"
    with pytest.raises(AppError) as absolute:
        bundled_sample_path("/etc/passwd")
    assert absolute.value.code == "SAMPLE_NOT_FOUND"
    path = bundled_sample_path("facilio-demo-customers.csv")
    assert path.name == "facilio-demo-customers.csv"
    assert path.is_file()


def test_normal_upload_is_not_marked_sample(client) -> None:
    from io import BytesIO

    content = bundled_sample_path("facilio-demo-customers.csv").read_bytes()
    response = client.post(
        "/api/v1/datasets",
        data={"file": (BytesIO(content), "mine.csv")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["is_sample"] is False
    assert data["sample_key"] is None
    assert data["name"] != "Sample: Customer data"
