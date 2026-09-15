"""Asynchronous jobs, attempts, and worker heartbeats.

Revision ID: 007_phase7_jobs
Revises: 006_sqlite_uuid_normalize
Create Date: 2026-09-11
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "007_phase7_jobs"
down_revision: str | None = "006_sqlite_uuid_normalize"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    inspector.clear_cache()
    columns = {column["name"] for column in inspector.get_columns("workflow_runs")}
    if "started_at" in columns:
        with op.batch_alter_table("workflow_runs") as batch:
            batch.alter_column("started_at", existing_type=sa.DateTime(timezone=True), nullable=True)

    version_indexes = {index["name"] for index in inspector.get_indexes("dataset_versions")}
    if "uq_dataset_versions_workflow_run" not in version_indexes:
        with op.batch_alter_table("dataset_versions") as batch:
            batch.create_unique_constraint(
                "uq_dataset_versions_workflow_run",
                ["created_by_workflow_run_id"],
            )

    if "jobs" not in inspector.get_table_names():
        op.create_table(
            "jobs",
            sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
            sa.Column("job_type", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=24), nullable=False),
            sa.Column("workflow_run_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("workflow_id", sa.Uuid(as_uuid=True), nullable=True),
            sa.Column("dataset_id", sa.Uuid(as_uuid=True), nullable=True),
            sa.Column("input_version_id", sa.Uuid(as_uuid=True), nullable=True),
            sa.Column("output_version_id", sa.Uuid(as_uuid=True), nullable=True),
            sa.Column("queue_name", sa.String(length=64), nullable=False),
            sa.Column("attempt_count", sa.Integer(), nullable=False),
            sa.Column("max_attempts", sa.Integer(), nullable=False),
            sa.Column("progress_current", sa.Integer(), nullable=False),
            sa.Column("progress_total", sa.Integer(), nullable=False),
            sa.Column("current_step_position", sa.Integer(), nullable=True),
            sa.Column("current_operation_code", sa.String(length=64), nullable=True),
            sa.Column("current_activity", sa.String(length=128), nullable=True),
            sa.Column("queued_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cancel_requested_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("request_id", sa.String(length=128), nullable=True),
            sa.Column("error_code", sa.String(length=64), nullable=True),
            sa.Column("error_message_safe", sa.Text(), nullable=True),
            sa.Column("error_category", sa.String(length=24), nullable=True),
            sa.Column("retryable", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(
                ["workflow_run_id"], ["workflow_runs.id"], ondelete="CASCADE"
            ),
            sa.UniqueConstraint("workflow_run_id", name="uq_jobs_workflow_run"),
        )
        op.create_index("ix_jobs_status", "jobs", ["status"])
        op.create_index("ix_jobs_created_at", "jobs", ["created_at"])
        op.create_index("ix_jobs_workflow_id", "jobs", ["workflow_id"])
        op.create_index("ix_jobs_dataset_id", "jobs", ["dataset_id"])
        op.create_index("ix_jobs_heartbeat_at", "jobs", ["heartbeat_at"])

    inspector.clear_cache()
    if "job_attempts" not in inspector.get_table_names():
        op.create_table(
            "job_attempts",
            sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
            sa.Column("job_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("attempt_number", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=24), nullable=False),
            sa.Column("worker_id", sa.String(length=128), nullable=True),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("duration_ms", sa.Integer(), nullable=True),
            sa.Column("error_code", sa.String(length=64), nullable=True),
            sa.Column("error_message_safe", sa.Text(), nullable=True),
            sa.Column("error_category", sa.String(length=24), nullable=True),
            sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
            sa.UniqueConstraint("job_id", "attempt_number", name="uq_job_attempts_number"),
        )
        op.create_index("ix_job_attempts_job_id", "job_attempts", ["job_id"])

    inspector.clear_cache()
    if "worker_heartbeats" not in inspector.get_table_names():
        op.create_table(
            "worker_heartbeats",
            sa.Column("worker_id", sa.String(length=128), primary_key=True),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("status", sa.String(length=24), nullable=False),
        )
        op.create_index(
            "ix_worker_heartbeats_last_seen_at",
            "worker_heartbeats",
            ["last_seen_at"],
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    inspector.clear_cache()
    tables = set(inspector.get_table_names())
    if "worker_heartbeats" in tables:
        op.drop_index("ix_worker_heartbeats_last_seen_at", table_name="worker_heartbeats")
        op.drop_table("worker_heartbeats")
    if "job_attempts" in tables:
        op.drop_index("ix_job_attempts_job_id", table_name="job_attempts")
        op.drop_table("job_attempts")
    if "jobs" in tables:
        op.drop_index("ix_jobs_heartbeat_at", table_name="jobs")
        op.drop_index("ix_jobs_dataset_id", table_name="jobs")
        op.drop_index("ix_jobs_workflow_id", table_name="jobs")
        op.drop_index("ix_jobs_created_at", table_name="jobs")
        op.drop_index("ix_jobs_status", table_name="jobs")
        op.drop_table("jobs")
    inspector.clear_cache()
    version_indexes = {index["name"] for index in inspector.get_indexes("dataset_versions")}
    if "uq_dataset_versions_workflow_run" in version_indexes:
        with op.batch_alter_table("dataset_versions") as batch:
            batch.drop_constraint("uq_dataset_versions_workflow_run", type_="unique")
    with op.batch_alter_table("workflow_runs") as batch:
        batch.alter_column("started_at", existing_type=sa.DateTime(timezone=True), nullable=False)
