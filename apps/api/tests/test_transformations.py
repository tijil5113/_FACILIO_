"""Transformation and version API tests."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pytest

from facilio.app import create_app
from facilio.db.base import Base
from facilio.db.session import Database
from tests.conftest import make_settings


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


def test_catalog_and_original_version(client) -> None:
    catalog = client.get("/api/v1/transformations")
    assert catalog.status_code == 200
    codes = {item["code"] for item in catalog.get_json()["data"]}
    assert "TRIM_WHITESPACE" in codes
    created = _upload(client, "a.csv", b"name,status\n Ada ,ACTIVE\nAda,active\n")
    dataset_id = created.get_json()["data"]["id"]
    assert created.get_json()["data"]["current_version_number"] == 1
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions")
    assert versions.status_code == 200
    items = versions.get_json()["data"]
    assert len(items) == 1
    assert items[0]["kind"] == "ORIGINAL"
    assert items[0]["is_current"] is True


def test_preview_does_not_persist_and_apply_creates_version(
    client, tmp_path: Path
) -> None:
    created = _upload(client, "a.csv", b"name\n Ada \nBob\n")
    data = created.get_json()["data"]
    dataset_id = data["id"]
    version_id = data["current_version_id"]
    preview = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/transformations/preview",
        json={"operation": "TRIM_WHITESPACE", "parameters": {"column": "name"}},
    )
    assert preview.status_code == 200
    body = preview.get_json()["data"]
    assert body["impact"]["changed_cell_count"] == 1
    assert body["impact"]["no_op"] is False
    still = client.get(f"/api/v1/datasets/{dataset_id}/versions")
    assert len(still.get_json()["data"]) == 1
    applied = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/transformations",
        json={"operation": "TRIM_WHITESPACE", "parameters": {"column": "name"}},
    )
    assert applied.status_code == 201
    payload = applied.get_json()["data"]
    assert payload["version"]["version_number"] == 2
    assert payload["version"]["kind"] == "DERIVED"
    listed = client.get(f"/api/v1/datasets/{dataset_id}/versions")
    assert len(listed.get_json()["data"]) == 2
    originals = list((tmp_path / "uploads").glob("*/source.csv"))
    assert originals
    assert originals[0].read_bytes() == b"name\n Ada \nBob\n"
    noop = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{payload['version']['id']}/transformations",
        json={"operation": "TRIM_WHITESPACE", "parameters": {"column": "name"}},
    )
    assert noop.status_code == 409
    assert noop.get_json()["error"]["code"] == "TRANSFORMATION_NOOP"


def test_lineage_branching_and_current(client) -> None:
    created = _upload(client, "a.csv", b"name,status\nAda,ACTIVE\nAda,ACTIVE\n")
    dataset_id = created.get_json()["data"]["id"]
    v1 = created.get_json()["data"]["current_version_id"]
    first = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{v1}/transformations",
        json={
            "operation": "NORMALIZE_CASE",
            "parameters": {"column": "status", "mode": "lowercase"},
        },
    )
    v2 = first.get_json()["data"]["version"]["id"]
    second = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{v1}/transformations",
        json={"operation": "REMOVE_DUPLICATES", "parameters": {}},
    )
    v3 = second.get_json()["data"]["version"]["id"]
    lineage = client.get(f"/api/v1/datasets/{dataset_id}/versions/{v3}/lineage")
    items = lineage.get_json()["data"]["items"]
    assert [item["version"]["version_number"] for item in items] == [1, 3]
    restored = client.patch(
        f"/api/v1/datasets/{dataset_id}/current-version",
        json={"version_id": v1},
    )
    assert restored.status_code == 200
    detail = client.get(f"/api/v1/datasets/{dataset_id}")
    assert detail.get_json()["data"]["current_version_id"] == v1
    compare = client.get(f"/api/v1/datasets/{dataset_id}/versions/{v2}/comparison")
    assert compare.status_code == 200
    assert compare.get_json()["data"]["parent"]["id"] == v1


def test_invalid_operation_and_missing_column(client) -> None:
    created = _upload(client, "a.csv", b"name\nAda\n")
    dataset_id = created.get_json()["data"]["id"]
    version_id = created.get_json()["data"]["current_version_id"]
    unknown = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/transformations/preview",
        json={"operation": "EVAL", "parameters": {}},
    )
    assert unknown.status_code == 400
    assert unknown.get_json()["error"]["code"] == "UNSUPPORTED_TRANSFORMATION"
    missing = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/transformations/preview",
        json={"operation": "TRIM_WHITESPACE", "parameters": {"column": "nope"}},
    )
    assert missing.get_json()["error"]["code"] == "COLUMN_NOT_FOUND"


def test_cast_failure_does_not_create_version(client) -> None:
    created = _upload(client, "a.csv", b"n\n1\nabc\n")
    dataset_id = created.get_json()["data"]["id"]
    version_id = created.get_json()["data"]["current_version_id"]
    response = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/transformations",
        json={
            "operation": "CAST_TYPE",
            "parameters": {"column": "n", "target_type": "INTEGER"},
        },
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "CAST_FAILED"
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions")
    assert len(versions.get_json()["data"]) == 1


def test_delete_cleans_derived_files(client, tmp_path: Path) -> None:
    created = _upload(client, "a.csv", b"name\n Ada \n")
    dataset_id = created.get_json()["data"]["id"]
    version_id = created.get_json()["data"]["current_version_id"]
    client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/transformations",
        json={"operation": "TRIM_WHITESPACE", "parameters": {"column": "name"}},
    )
    uploads = tmp_path / "uploads"
    assert list(uploads.rglob("data.ftable.json"))
    deleted = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert deleted.status_code == 200
    assert list(uploads.glob("*/source.csv")) == []
    assert list(uploads.rglob("data.ftable.json")) == []


def test_workspace_stats(client) -> None:
    _upload(client, "a.csv", b"name\nAda\n")
    stats = client.get("/api/v1/workspace/summary")
    assert stats.status_code == 200
    data = stats.get_json()["data"]
    assert data["datasets"] == 1
    assert data["derived_versions"] == 0
    assert data["user_dataset_count"] == 1
    assert data["sample_dataset_count"] == 0
    assert len(data["recent_datasets"]) == 1
