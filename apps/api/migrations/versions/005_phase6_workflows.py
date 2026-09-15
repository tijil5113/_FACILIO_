"""Linear workflow definitions, runs, and dataset-version lineage.

Revision ID: 005_phase6_workflows
Revises: 004_phase5_versions
Create Date: 2026-09-11
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "005_phase6_workflows"
down_revision: str | None = "004_phase5_versions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    inspector.clear_cache()
    if "workflows" in inspector.get_table_names():
        if "created_by_workflow_run_id" not in {
            column["name"] for column in inspector.get_columns("dataset_versions")
        }:
            op.add_column(
                "dataset_versions",
                sa.Column(
                    "created_by_workflow_run_id",
                    sa.Uuid(as_uuid=True),
                    nullable=True,
                ),
            )
            with op.batch_alter_table("dataset_versions") as batch:
                batch.create_foreign_key(
                    "fk_dataset_versions_workflow_run",
                    "workflow_runs",
                    ["created_by_workflow_run_id"],
                    ["id"],
                    ondelete="SET NULL",
                )
        return

    op.create_table(
        "workflows",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_workflows_updated_at", "workflows", ["updated_at"])
    op.create_index("ix_workflows_status", "workflows", ["status"])
    op.create_table(
        "workflow_steps",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("workflow_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("operation_code", sa.String(length=64), nullable=False),
        sa.Column("parameters_json", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflows.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("workflow_id", "position", name="uq_workflow_steps_position"),
    )
    op.create_index("ix_workflow_steps_workflow_id", "workflow_steps", ["workflow_id"])
    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("workflow_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("workflow_revision", sa.Integer(), nullable=False),
        sa.Column("workflow_snapshot", sa.JSON(), nullable=False),
        sa.Column("input_dataset_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("input_version_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("output_version_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message_safe", sa.Text(), nullable=True),
        sa.Column("quality_before", sa.Float(), nullable=True),
        sa.Column("quality_after", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflows.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["input_dataset_id"], ["datasets.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["input_version_id"], ["dataset_versions.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["output_version_id"], ["dataset_versions.id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_workflow_runs_workflow_id", "workflow_runs", ["workflow_id"])
    op.create_index("ix_workflow_runs_created_at", "workflow_runs", ["created_at"])
    op.create_index("ix_workflow_runs_status", "workflow_runs", ["status"])
    op.create_index(
        "ix_workflow_runs_input_dataset_id", "workflow_runs", ["input_dataset_id"]
    )
    op.create_table(
        "workflow_step_runs",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("workflow_run_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("workflow_step_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("step_snapshot", sa.JSON(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("operation_code", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("rows_before", sa.Integer(), nullable=True),
        sa.Column("rows_after", sa.Integer(), nullable=True),
        sa.Column("columns_before", sa.Integer(), nullable=True),
        sa.Column("columns_after", sa.Integer(), nullable=True),
        sa.Column("changed_cells", sa.Integer(), nullable=True),
        sa.Column("removed_rows", sa.Integer(), nullable=True),
        sa.Column("removed_columns", sa.Integer(), nullable=True),
        sa.Column("warning_summary", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message_safe", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["workflow_run_id"], ["workflow_runs.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        "ix_workflow_step_runs_run_id", "workflow_step_runs", ["workflow_run_id"]
    )
    op.add_column(
        "dataset_versions",
        sa.Column("created_by_workflow_run_id", sa.Uuid(as_uuid=True), nullable=True),
    )
    with op.batch_alter_table("dataset_versions") as batch:
        batch.create_foreign_key(
            "fk_dataset_versions_workflow_run",
            "workflow_runs",
            ["created_by_workflow_run_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("dataset_versions") as batch:
        batch.drop_constraint("fk_dataset_versions_workflow_run", type_="foreignkey")
        batch.drop_column("created_by_workflow_run_id")
    op.drop_index("ix_workflow_step_runs_run_id", table_name="workflow_step_runs")
    op.drop_table("workflow_step_runs")
    op.drop_index("ix_workflow_runs_input_dataset_id", table_name="workflow_runs")
    op.drop_index("ix_workflow_runs_status", table_name="workflow_runs")
    op.drop_index("ix_workflow_runs_created_at", table_name="workflow_runs")
    op.drop_index("ix_workflow_runs_workflow_id", table_name="workflow_runs")
    op.drop_table("workflow_runs")
    op.drop_index("ix_workflow_steps_workflow_id", table_name="workflow_steps")
    op.drop_table("workflow_steps")
    op.drop_index("ix_workflows_status", table_name="workflows")
    op.drop_index("ix_workflows_updated_at", table_name="workflows")
    op.drop_table("workflows")
