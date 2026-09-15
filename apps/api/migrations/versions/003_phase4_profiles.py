"""Create dataset profile, column profile, and quality issue tables.

Revision ID: 003_phase4_profiles
Revises: 002_phase3_datasets
Create Date: 2026-09-10

Hybrid persistence: dataset-level summary and quality scores live on
dataset_profiles; per-column statistics are JSON on column_profiles;
issues are relational rows for filtering and pagination. Source bytes
are never copied into these tables.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "003_phase4_profiles"
down_revision: str | None = "002_phase3_datasets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "dataset_profiles",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("dataset_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("profile_version", sa.String(length=32), nullable=False),
        sa.Column("stale", sa.Boolean(), nullable=False),
        sa.Column("profiled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("summary_json", sa.JSON(), nullable=True),
        sa.Column("quality_json", sa.JSON(), nullable=True),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("overall_status", sa.String(length=32), nullable=True),
        sa.Column("grade", sa.String(length=32), nullable=True),
        sa.Column("issue_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("dataset_id"),
    )
    op.create_index("ix_dataset_profiles_status", "dataset_profiles", ["status"])
    op.create_table(
        "column_profiles",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("profile_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("detected_type", sa.String(length=32), nullable=False),
        sa.Column("ingestion_dtype", sa.String(length=32), nullable=True),
        sa.Column("semantic_hint", sa.String(length=32), nullable=True),
        sa.Column("cardinality", sa.String(length=32), nullable=False),
        sa.Column("issue_count", sa.Integer(), nullable=False),
        sa.Column("stats_json", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(
            ["profile_id"], ["dataset_profiles.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_column_profiles_profile_id", "column_profiles", ["profile_id"])
    op.create_table(
        "quality_issues",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("profile_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("issue_key", sa.String(length=256), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("column_name", sa.String(length=512), nullable=True),
        sa.Column("affected_count", sa.Integer(), nullable=False),
        sa.Column("affected_percentage", sa.Float(), nullable=True),
        sa.Column("evidence_json", sa.JSON(), nullable=False),
        sa.Column("suggested_action", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["profile_id"], ["dataset_profiles.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_quality_issues_profile_id", "quality_issues", ["profile_id"])
    op.create_index("ix_quality_issues_severity", "quality_issues", ["severity"])


def downgrade() -> None:
    op.drop_index("ix_quality_issues_severity", table_name="quality_issues")
    op.drop_index("ix_quality_issues_profile_id", table_name="quality_issues")
    op.drop_table("quality_issues")
    op.drop_index("ix_column_profiles_profile_id", table_name="column_profiles")
    op.drop_table("column_profiles")
    op.drop_index("ix_dataset_profiles_status", table_name="dataset_profiles")
    op.drop_table("dataset_profiles")
