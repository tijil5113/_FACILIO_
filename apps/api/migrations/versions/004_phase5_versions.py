"""Immutable dataset versions, transformations, and per-version profiles.

Revision ID: 004_phase5_versions
Revises: 003_phase4_profiles
Create Date: 2026-09-10

Existing datasets receive an ORIGINAL V1 that references the current
storage_key. Existing profiles are attached to that V1. Source bytes are
not copied.

SQLite stores UUID columns as CHAR and cannot bind uuid.UUID objects.
A failed backfill can leave tables created while alembic_version stays on
003, so this upgrade is safe to resume.
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from uuid import UUID, uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine.reflection import Inspector

revision: str = "004_phase5_versions"
down_revision: str | None = "003_phase4_profiles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _inspector() -> Inspector:
    inspector = sa.inspect(op.get_bind())
    inspector.clear_cache()
    return inspector


def _column_names(inspector: Inspector, table: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table)}


def _index_names(inspector: Inspector, table: str) -> set[str]:
    return {index["name"] for index in inspector.get_indexes(table) if index.get("name")}


def _unique_names(inspector: Inspector, table: str) -> set[str]:
    return {
        item["name"]
        for item in inspector.get_unique_constraints(table)
        if item.get("name")
    }


def _has_fk(
    inspector: Inspector, table: str, constrained: list[str], referred: str
) -> bool:
    return any(
        fk.get("constrained_columns") == constrained
        and fk.get("referred_table") == referred
        for fk in inspector.get_foreign_keys(table)
    )


def _drop_alembic_tmp_tables(inspector: Inspector) -> None:
    for table in inspector.get_table_names():
        if table.startswith("_alembic_tmp_"):
            op.drop_table(table)


def _as_bind_id(value: object) -> str:
    if isinstance(value, UUID):
        return value.hex
    return str(value)


def _uuid_key(value: object) -> str:
    return _as_bind_id(value).replace("-", "").lower()


def _as_bind_json(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return str(value)


def upgrade() -> None:
    inspector = _inspector()
    _drop_alembic_tmp_tables(inspector)
    inspector = _inspector()
    tables = set(inspector.get_table_names())

    if "dataset_versions" not in tables:
        op.create_table(
            "dataset_versions",
            sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
            sa.Column("dataset_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("version_number", sa.Integer(), nullable=False),
            sa.Column("parent_version_id", sa.Uuid(as_uuid=True), nullable=True),
            sa.Column("kind", sa.String(length=16), nullable=False),
            sa.Column("storage_key", sa.String(length=512), nullable=False),
            sa.Column("storage_format", sa.String(length=32), nullable=False),
            sa.Column("row_count", sa.Integer(), nullable=True),
            sa.Column("column_count", sa.Integer(), nullable=True),
            sa.Column("columns_json", sa.JSON(), nullable=True),
            sa.Column("label", sa.String(length=256), nullable=False),
            sa.Column("profile_status", sa.String(length=32), nullable=False),
            sa.Column("profiled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column(
                "created_by_transformation_id", sa.Uuid(as_uuid=True), nullable=True
            ),
            sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["parent_version_id"], ["dataset_versions.id"], ondelete="SET NULL"
            ),
            sa.UniqueConstraint(
                "dataset_id", "version_number", name="uq_dataset_versions_number"
            ),
        )
        inspector = _inspector()

    if "ix_dataset_versions_dataset_id" not in _index_names(
        inspector, "dataset_versions"
    ):
        op.create_index(
            "ix_dataset_versions_dataset_id", "dataset_versions", ["dataset_id"]
        )
        inspector = _inspector()

    if "current_version_id" not in _column_names(inspector, "datasets"):
        op.add_column(
            "datasets",
            sa.Column("current_version_id", sa.Uuid(as_uuid=True), nullable=True),
        )
        inspector = _inspector()

    if not _has_fk(inspector, "datasets", ["current_version_id"], "dataset_versions"):
        with op.batch_alter_table("datasets") as batch:
            batch.create_foreign_key(
                "fk_datasets_current_version",
                "dataset_versions",
                ["current_version_id"],
                ["id"],
                ondelete="SET NULL",
            )
        inspector = _inspector()

    tables = set(inspector.get_table_names())
    if "transformations" not in tables:
        op.create_table(
            "transformations",
            sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
            sa.Column("dataset_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("input_version_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("output_version_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("operation_code", sa.String(length=64), nullable=False),
            sa.Column("parameters_json", sa.JSON(), nullable=False),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("impact_json", sa.JSON(), nullable=False),
            sa.Column("extra_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["input_version_id"], ["dataset_versions.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["output_version_id"], ["dataset_versions.id"], ondelete="CASCADE"
            ),
            sa.UniqueConstraint("output_version_id"),
        )
        inspector = _inspector()

    if "version_id" not in _column_names(inspector, "dataset_profiles"):
        op.add_column(
            "dataset_profiles",
            sa.Column("version_id", sa.Uuid(as_uuid=True), nullable=True),
        )

    _backfill()
    inspector = _inspector()
    unique_names = [
        item["name"]
        for item in inspector.get_unique_constraints("dataset_profiles")
        if item.get("column_names") == ["dataset_id"] and item.get("name")
    ]
    version_col = next(
        column
        for column in inspector.get_columns("dataset_profiles")
        if column["name"] == "version_id"
    )
    needs_not_null = bool(version_col.get("nullable", True))
    needs_version_unique = (
        "uq_dataset_profiles_version_id" not in _unique_names(inspector, "dataset_profiles")
    )
    needs_version_fk = not _has_fk(
        inspector, "dataset_profiles", ["version_id"], "dataset_versions"
    )
    if needs_not_null or needs_version_unique or needs_version_fk or unique_names:
        with op.batch_alter_table("dataset_profiles") as batch:
            if needs_not_null:
                batch.alter_column("version_id", nullable=False)
            if needs_version_unique:
                batch.create_unique_constraint(
                    "uq_dataset_profiles_version_id", ["version_id"]
                )
            if needs_version_fk:
                batch.create_foreign_key(
                    "fk_dataset_profiles_version_id",
                    "dataset_versions",
                    ["version_id"],
                    ["id"],
                    ondelete="CASCADE",
                )
            for name in unique_names:
                batch.drop_constraint(name, type_="unique")


def _backfill() -> None:
    connection = op.get_bind()
    datasets = connection.execute(
        sa.text(
            "SELECT id, storage_key, file_type, row_count, column_count, "
            "columns_json, created_at FROM datasets"
        )
    ).mappings()
    for row in datasets:
        dataset_id = _as_bind_id(row["id"])
        dataset_id_key = _uuid_key(row["id"])
        existing = (
            connection.execute(
                sa.text(
                    """
                    SELECT id FROM dataset_versions
                    WHERE REPLACE(LOWER(CAST(dataset_id AS TEXT)), '-', '') = :dataset_id_key
                      AND version_number = 1
                    """
                ),
                {"dataset_id_key": dataset_id_key},
            )
            .mappings()
            .first()
        )
        if existing is None:
            version_id = uuid4().hex
            connection.execute(
                sa.text(
                    """
                    INSERT INTO dataset_versions (
                        id, dataset_id, version_number, parent_version_id, kind,
                        storage_key, storage_format, row_count, column_count,
                        columns_json, label, profile_status, profiled_at, created_at,
                        created_by_transformation_id
                    ) VALUES (
                        :id, :dataset_id, 1, NULL, 'ORIGINAL',
                        :storage_key, :storage_format, :row_count, :column_count,
                        :columns_json, 'Original', 'NOT_PROFILED', NULL, :created_at,
                        NULL
                    )
                    """
                ),
                {
                    "id": version_id,
                    "dataset_id": dataset_id,
                    "storage_key": row["storage_key"],
                    "storage_format": row["file_type"],
                    "row_count": row["row_count"],
                    "column_count": row["column_count"],
                    "columns_json": _as_bind_json(row["columns_json"]),
                    "created_at": row["created_at"],
                },
            )
        else:
            version_id = _uuid_key(existing["id"])

        connection.execute(
            sa.text(
                """
                UPDATE datasets
                SET current_version_id = :version_id
                WHERE REPLACE(LOWER(CAST(id AS TEXT)), '-', '') = :dataset_id_key
                  AND current_version_id IS NULL
                """
            ),
            {"version_id": version_id, "dataset_id_key": dataset_id_key},
        )
        connection.execute(
            sa.text(
                """
                UPDATE dataset_profiles
                SET version_id = :version_id
                WHERE REPLACE(LOWER(CAST(dataset_id AS TEXT)), '-', '') = :dataset_id_key
                  AND version_id IS NULL
                """
            ),
            {"version_id": version_id, "dataset_id_key": dataset_id_key},
        )
        connection.execute(
            sa.text(
                """
                UPDATE dataset_versions
                SET profile_status = (
                    SELECT status FROM dataset_profiles
                    WHERE dataset_profiles.version_id = :version_id
                ),
                profiled_at = (
                    SELECT profiled_at FROM dataset_profiles
                    WHERE dataset_profiles.version_id = :version_id
                )
                WHERE id = :version_id
                  AND EXISTS (
                    SELECT 1 FROM dataset_profiles
                    WHERE dataset_profiles.version_id = :version_id
                  )
                """
            ),
            {"version_id": version_id},
        )


def downgrade() -> None:
    with op.batch_alter_table("dataset_profiles") as batch:
        batch.drop_constraint("fk_dataset_profiles_version_id", type_="foreignkey")
        batch.drop_constraint("uq_dataset_profiles_version_id", type_="unique")
        batch.drop_column("version_id")
        batch.create_unique_constraint(
            "dataset_profiles_dataset_id_key", ["dataset_id"]
        )
    op.drop_table("transformations")
    with op.batch_alter_table("datasets") as batch:
        batch.drop_constraint("fk_datasets_current_version", type_="foreignkey")
        batch.drop_column("current_version_id")
    op.drop_index("ix_dataset_versions_dataset_id", table_name="dataset_versions")
    op.drop_table("dataset_versions")
