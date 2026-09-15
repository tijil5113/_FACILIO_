"""Mark sample datasets for the first-run demo.

Revision ID: 008_phase8b_sample_datasets
Revises: 007_phase7_jobs
Create Date: 2026-09-14
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "008_phase8b_sample_datasets"
down_revision: str | None = "007_phase7_jobs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    inspector.clear_cache()
    columns = {column["name"] for column in inspector.get_columns("datasets")}
    with op.batch_alter_table("datasets") as batch:
        if "is_sample" not in columns:
            batch.add_column(
                sa.Column(
                    "is_sample",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                )
            )
        if "sample_key" not in columns:
            batch.add_column(sa.Column("sample_key", sa.String(length=64), nullable=True))
    inspector.clear_cache()
    indexes = {index["name"] for index in inspector.get_indexes("datasets")}
    if "uq_datasets_sample_key" not in indexes:
        op.create_index(
            "uq_datasets_sample_key",
            "datasets",
            ["sample_key"],
            unique=True,
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    indexes = {index["name"] for index in inspector.get_indexes("datasets")}
    if "uq_datasets_sample_key" in indexes:
        op.drop_index("uq_datasets_sample_key", table_name="datasets")
    with op.batch_alter_table("datasets") as batch:
        batch.drop_column("sample_key")
        batch.drop_column("is_sample")
