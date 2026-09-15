"""Normalize SQLite UUID CHAR values to 32-character hex.

Revision ID: 006_sqlite_uuid_normalize
Revises: 005_phase6_workflows
Create Date: 2026-09-11

SQLAlchemy's Uuid(as_uuid=True) on SQLite stores and looks up 32-char hex
without hyphens. A Python uuid.UUID bound as str() can persist hyphenated
values, which then fail relationship loads.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "006_sqlite_uuid_normalize"
down_revision: str | None = "005_phase6_workflows"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_UUID_COLUMNS = (
    ("datasets", "id"),
    ("datasets", "current_version_id"),
    ("dataset_versions", "id"),
    ("dataset_versions", "dataset_id"),
    ("dataset_versions", "parent_version_id"),
    ("dataset_versions", "created_by_transformation_id"),
    ("dataset_versions", "created_by_workflow_run_id"),
    ("dataset_profiles", "id"),
    ("dataset_profiles", "dataset_id"),
    ("dataset_profiles", "version_id"),
    ("column_profiles", "id"),
    ("column_profiles", "profile_id"),
    ("quality_issues", "id"),
    ("quality_issues", "profile_id"),
    ("transformations", "id"),
    ("transformations", "dataset_id"),
    ("transformations", "input_version_id"),
    ("transformations", "output_version_id"),
    ("staging_uploads", "id"),
    ("workflows", "id"),
    ("workflow_steps", "id"),
    ("workflow_steps", "workflow_id"),
    ("workflow_runs", "id"),
    ("workflow_runs", "workflow_id"),
    ("workflow_runs", "input_dataset_id"),
    ("workflow_runs", "input_version_id"),
    ("workflow_runs", "output_version_id"),
    ("workflow_step_runs", "id"),
    ("workflow_step_runs", "workflow_run_id"),
    ("workflow_step_runs", "workflow_step_id"),
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        return
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    for table, column in _UUID_COLUMNS:
        if table not in tables:
            continue
        column_names = {item["name"] for item in inspector.get_columns(table)}
        if column not in column_names:
            continue
        bind.execute(
            sa.text(
                f'UPDATE "{table}" SET "{column}" = REPLACE("{column}", "-", "") '
                f'WHERE "{column}" LIKE "%-%"'
            )
        )


def downgrade() -> None:
    return
