"""Asynchronous job dispatch, claiming, cancellation, retry, and recovery."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from facilio.app import create_app
from facilio.db.base import Base
from facilio.db.session import Database
from facilio.jobs import state
from facilio.jobs.queue import MemoryJobQueue
from facilio.models.job import Job
from facilio.services.job_executor import JobExecutor
from tests.conftest import make_settings

CUSTOMERS = (
    b"customer_name,status,lifetime_value,city\n"
    b" Alice Johnson ,ACTIVE,120,Paris\n"
    b"Kate Martin,active,,Lyon\n"
    b" Alice Johnson ,ACTIVE,120,Paris\n"
)


def _client(tmp_path: Path):
    settings = make_settings(
        DATABASE_URL=f"sqlite:///{tmp_path / 'jobs.db'}",
        UPLOAD_ROOT=str(tmp_path / "uploads"),
        MAX_JOB_ATTEMPTS=3,
        JOB_STALE_SECONDS=30,
    )
    app = create_app(settings)
    database: Database = app.extensions["database"]
    assert database.engine is not None
    Base.metadata.create_all(database.engine)
    return app.test_client(), app


def _upload(client, content: bytes = CUSTOMERS):
    return client.post(
        "/api/v1/datasets",
        data={"file": (BytesIO(content), "customers.csv")},
        content_type="multipart/form-data",
    )


def _cleanup(client) -> str:
    created = client.post("/api/v1/workflows", json={"name": "Customer Data Cleanup"})
    workflow_id = created.get_json()["data"]["id"]
    for step in (
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
    ):
        client.post(f"/api/v1/workflows/{workflow_id}/steps", json=step)
    return workflow_id


def _execute(app, job_id: str, **kwargs) -> None:
    JobExecutor(app.config["FACILIO_SETTINGS"], app.extensions["database"]).execute(
        job_id, **kwargs
    )


def test_state_machine_rejects_invalid_transitions() -> None:
    state.assert_transition("QUEUED", "RUNNING")
    state.assert_transition("FAILED", "QUEUED")
    try:
        state.assert_transition("SUCCEEDED", "CANCELLED")
    except Exception as error:
        assert getattr(error, "code", "") == "JOB_INVALID_STATE"
    else:
        raise AssertionError("expected invalid transition")


def test_dispatch_returns_202_and_does_not_create_version(tmp_path: Path) -> None:
    client, _app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={"dataset_id": dataset_id, "version_id": version_id},
    )
    assert response.status_code == 202
    payload = response.get_json()["data"]
    assert payload["job"]["status"] == "QUEUED"
    assert payload["workflow_run"]["status"] == "QUEUED"
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 1
    queue = client.application.extensions["job_queue"]
    assert isinstance(queue, MemoryJobQueue)
    assert payload["job"]["id"] in queue.items


def test_worker_creates_one_output_and_duplicate_execute_is_safe(
    tmp_path: Path,
) -> None:
    client, app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    dataset_id = uploaded.get_json()["data"]["id"]
    version_id = uploaded.get_json()["data"]["current_version_id"]
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={"dataset_id": dataset_id, "version_id": version_id},
    )
    job_id = response.get_json()["data"]["job"]["id"]
    _execute(app, job_id)
    _execute(app, job_id)
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 2
    job = client.get(f"/api/v1/jobs/{job_id}").get_json()["data"]
    assert job["status"] == "SUCCEEDED"
    assert job["attempt_count"] == 1


def test_two_workers_cannot_claim_the_same_queued_job(tmp_path: Path) -> None:
    client, app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    job_id = response.get_json()["data"]["job"]["id"]
    first = JobExecutor(
        app.config["FACILIO_SETTINGS"], app.extensions["database"], worker_id="w1"
    )
    second = JobExecutor(
        app.config["FACILIO_SETTINGS"], app.extensions["database"], worker_id="w2"
    )
    claimed = first._claim(__import__("uuid").UUID(job_id))
    assert claimed is not None
    assert second._claim(__import__("uuid").UUID(job_id)) is None


def test_cancel_queued_job(tmp_path: Path) -> None:
    client, app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    job_id = response.get_json()["data"]["job"]["id"]
    cancelled = client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert cancelled.status_code == 200
    body = cancelled.get_json()["data"]
    assert body["status"] == "CANCELLED"
    _execute(app, job_id)
    versions = client.get(
        f"/api/v1/datasets/{uploaded.get_json()['data']['id']}/versions"
    ).get_json()["data"]
    assert len(versions) == 1


def test_cancel_running_between_steps(tmp_path: Path) -> None:
    client, app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    job_id = response.get_json()["data"]["job"]["id"]
    dataset_id = uploaded.get_json()["data"]["id"]

    def cancel_after_first() -> None:
        client.post(f"/api/v1/jobs/{job_id}/cancel")

    _execute(app, job_id, after_step=cancel_after_first)
    job = client.get(f"/api/v1/jobs/{job_id}").get_json()["data"]
    assert job["status"] == "CANCELLED"
    assert job["progress"]["current"] >= 1
    statuses = [item["status"] for item in job["step_runs"]]
    assert "CANCELLED" in statuses
    assert "SUCCEEDED" in statuses
    versions = client.get(f"/api/v1/datasets/{dataset_id}/versions").get_json()["data"]
    assert len(versions) == 1


def test_cancel_succeeded_job_rejected(tmp_path: Path) -> None:
    client, app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    job_id = response.get_json()["data"]["job"]["id"]
    _execute(app, job_id)
    denied = client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert denied.status_code == 409
    assert denied.get_json()["error"]["code"] == "JOB_CANCEL_NOT_ALLOWED"


def test_data_failure_is_not_retryable(tmp_path: Path) -> None:
    client, app = _client(tmp_path)
    created = client.post("/api/v1/workflows", json={"name": "Cast fail"})
    workflow_id = created.get_json()["data"]["id"]
    client.post(
        f"/api/v1/workflows/{workflow_id}/steps",
        json={
            "operation_code": "CAST_TYPE",
            "parameters": {"column": "amount", "target_type": "INTEGER"},
        },
    )
    uploaded = client.post(
        "/api/v1/datasets",
        data={"file": (BytesIO(b"amount\nx\n"), "bad.csv")},
        content_type="multipart/form-data",
    )
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    job_id = response.get_json()["data"]["job"]["id"]
    _execute(app, job_id)
    job = client.get(f"/api/v1/jobs/{job_id}").get_json()["data"]
    assert job["status"] == "FAILED"
    assert job["retryable"] is False
    retry = client.post(f"/api/v1/jobs/{job_id}/retry")
    assert retry.status_code == 409
    assert retry.get_json()["error"]["code"] == "JOB_RETRY_NOT_ALLOWED"


def test_retry_worker_lost_reuses_snapshot(tmp_path: Path) -> None:
    client, app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    job_id = response.get_json()["data"]["job"]["id"]
    run_id = response.get_json()["data"]["workflow_run"]["id"]
    snapshot_revision = response.get_json()["data"]["workflow_run"]["workflow_revision"]
    with app.extensions["database"].session_scope() as session:
        job = session.get(Job, __import__("uuid").UUID(job_id))
        assert job is not None
        job.status = "FAILED"
        job.retryable = True
        job.error_code = "WORKER_LOST"
        job.attempt_count = 1
    client.post(
        f"/api/v1/workflows/{workflow_id}/steps",
        json={"operation_code": "DROP_COLUMN", "parameters": {"column": "city"}},
    )
    retried = client.post(f"/api/v1/jobs/{job_id}/retry")
    assert retried.status_code == 200
    assert retried.get_json()["data"]["status"] == "QUEUED"
    _execute(app, job_id)
    job = client.get(f"/api/v1/jobs/{job_id}").get_json()["data"]
    run = client.get(f"/api/v1/workflow-runs/{run_id}").get_json()["data"]
    assert job["status"] == "SUCCEEDED"
    assert job["attempt_count"] == 2
    assert run["workflow_revision"] == snapshot_revision
    assert len(run["workflow_snapshot"]["steps"]) == 4
    versions = client.get(
        f"/api/v1/datasets/{uploaded.get_json()['data']['id']}/versions"
    ).get_json()["data"]
    assert len(versions) == 2


def test_stale_running_job_marked_worker_lost(tmp_path: Path) -> None:
    client, app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    job_id = response.get_json()["data"]["job"]["id"]
    stale = datetime.now(UTC) - timedelta(minutes=10)
    with app.extensions["database"].session_scope() as session:
        job = session.get(Job, __import__("uuid").UUID(job_id))
        assert job is not None
        job.status = "RUNNING"
        job.heartbeat_at = stale
        job.started_at = stale
    recovered = client.post("/api/v1/operations/recover")
    assert recovered.status_code == 200
    assert recovered.get_json()["data"]["recovered"] == 1
    job = client.get(f"/api/v1/jobs/{job_id}").get_json()["data"]
    assert job["status"] == "FAILED"
    assert job["error_code"] == "WORKER_LOST"
    assert job["retryable"] is True
    versions = client.get(
        f"/api/v1/datasets/{uploaded.get_json()['data']['id']}/versions"
    ).get_json()["data"]
    assert len(versions) == 1


def test_enqueue_failure_marks_job_failed(tmp_path: Path) -> None:
    client, _app = _client(tmp_path)
    queue: MemoryJobQueue = client.application.extensions["job_queue"]
    queue.fail_next = True
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    assert response.status_code == 503
    assert response.get_json()["error"]["code"] == "QUEUE_DISPATCH_FAILED"
    listed = client.get("/api/v1/jobs?status=FAILED")
    assert listed.get_json()["data"]["total"] == 1
    assert (
        listed.get_json()["data"]["items"][0]["error_code"] == "QUEUE_DISPATCH_FAILED"
    )


def test_jobs_list_filters_and_missing_job(tmp_path: Path) -> None:
    client, app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    job_id = response.get_json()["data"]["job"]["id"]
    _execute(app, job_id)
    listed = client.get(f"/api/v1/jobs?status=SUCCEEDED&workflow_id={workflow_id}")
    assert listed.get_json()["data"]["total"] == 1
    prefix = job_id.replace("-", "")[:8]
    searched = client.get(f"/api/v1/jobs?q={prefix}")
    assert searched.get_json()["data"]["total"] == 1
    missing = client.get(f"/api/v1/jobs/{uuid4()}")
    assert missing.status_code == 404
    health = client.get("/api/v1/operations/health")
    assert health.status_code == 200
    assert health.get_json()["data"]["queue"]["backend"] == "memory"


def test_job_service_rejects_invalid_page(tmp_path: Path) -> None:
    client, _app = _client(tmp_path)
    from facilio.core.errors import AppError
    from facilio.services.jobs import JobService

    service = JobService(
        client.application.config["FACILIO_SETTINGS"],
        client.application.extensions["database"],
        client.application.extensions["job_queue"],
    )
    try:
        service.list_jobs(page=0, page_size=20)
    except AppError as error:
        assert error.status_code == 422
        assert error.code == "VALIDATION_ERROR"
    else:
        raise AssertionError("expected invalid page to fail")
    listed = client.get("/api/v1/jobs?page=0")
    assert listed.status_code == 422


def test_orphan_queued_job_is_failed_without_duplicate_output(tmp_path: Path) -> None:
    client, app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    job_id = response.get_json()["data"]["job"]["id"]
    queue: MemoryJobQueue = app.extensions["job_queue"]
    queue.items.clear()
    stale = datetime.now(UTC) - timedelta(minutes=10)
    with app.extensions["database"].session_scope() as session:
        job = session.get(Job, __import__("uuid").UUID(job_id))
        assert job is not None
        job.queued_at = stale
    recovered = client.post("/api/v1/operations/recover")
    assert recovered.status_code == 200
    assert recovered.get_json()["data"]["recovered"] == 1
    job = client.get(f"/api/v1/jobs/{job_id}").get_json()["data"]
    assert job["status"] == "FAILED"
    assert job["error_code"] == "QUEUE_ORPHAN"
    assert job["retryable"] is True
    versions = client.get(
        f"/api/v1/datasets/{uploaded.get_json()['data']['id']}/versions"
    ).get_json()["data"]
    assert len(versions) == 1
    recovered_again = client.post("/api/v1/operations/recover")
    assert recovered_again.get_json()["data"]["recovered"] == 0


def test_process_job_and_task_entry(tmp_path: Path, monkeypatch) -> None:
    client, app = _client(tmp_path)
    workflow_id = _cleanup(client)
    uploaded = _upload(client)
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={
            "dataset_id": uploaded.get_json()["data"]["id"],
            "version_id": uploaded.get_json()["data"]["current_version_id"],
        },
    )
    job_id = response.get_json()["data"]["job"]["id"]
    monkeypatch.setattr("facilio.worker.runtime._APP", app)
    from facilio.jobs.tasks import execute_workflow_job

    execute_workflow_job(job_id)
    job = client.get(f"/api/v1/jobs/{job_id}").get_json()["data"]
    assert job["status"] == "SUCCEEDED"


def test_worker_recover_command(tmp_path: Path, monkeypatch) -> None:
    _client_obj, app = _client(tmp_path)
    monkeypatch.setattr("facilio.worker.runtime._APP", app)
    from facilio.worker.runtime import main, recover_stale_jobs

    assert recover_stale_jobs() == 0
    assert main(["recover"]) == 0


def test_classify_and_retryability() -> None:
    from facilio.jobs import classify

    assert classify.classify("CAST_FAILED") == classify.DATA
    assert classify.classify("WORKER_LOST") == classify.WORKER
    assert classify.classify("QUEUE_DISPATCH_FAILED") == classify.INFRASTRUCTURE
    assert classify.classify("QUEUE_ORPHAN") == classify.INFRASTRUCTURE
    assert classify.is_retryable("WORKER_LOST") is True
    assert classify.is_retryable("QUEUE_ORPHAN") is True
    assert classify.is_retryable("CAST_FAILED") is False
    assert classify.is_retryable(None) is False


def test_redis_queue_ping_and_enqueue_failure(monkeypatch) -> None:
    from facilio.jobs.queue import RedisJobQueue

    class FakeRedis:
        def ping(self):
            raise ConnectionError

    class FakeQueue:
        def __init__(self, *_args, **_kwargs):
            self.count = 2
            self.jobs = []

        def enqueue(self, *_args, **_kwargs):
            raise ConnectionError("down")

    monkeypatch.setattr("redis.from_url", lambda _url: FakeRedis())
    monkeypatch.setattr("rq.Queue", FakeQueue)
    queue = RedisJobQueue("redis://localhost:6379/0", "workflows")
    assert queue.ping() is False
    assert queue.queued_count() == 2
    assert queue.backend() == "redis"
    try:
        queue.enqueue(str(uuid4()))
    except Exception as error:
        assert getattr(error, "code", "") == "QUEUE_UNAVAILABLE"
    else:
        raise AssertionError("expected enqueue failure")


def test_worker_main_requires_redis(monkeypatch) -> None:
    from facilio.core.config import Settings
    from facilio.worker.runtime import main

    monkeypatch.setattr(
        "facilio.worker.runtime.get_settings",
        lambda: Settings(
            APP_ENV="testing",
            SECRET_KEY="test-secret-key-not-for-production",
            DATABASE_URL="sqlite:///:memory:",
            REDIS_URL="",
        ),
    )
    assert main(["work"]) == 2


def test_heartbeat_loop_beats_more_than_once_then_stops() -> None:
    from facilio.worker.heartbeat import HeartbeatLoop

    loop = HeartbeatLoop(999, lambda: None)
    waits = [False, False, True]

    def fake_wait(_timeout):
        return waits.pop(0) if waits else True

    loop._stop.wait = fake_wait  # type: ignore[method-assign]
    loop._run()
    assert loop.beats == 3
    frozen = loop.beats
    loop.stop()
    assert loop.beats == frozen
    assert loop._thread is None
