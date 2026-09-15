"""Alembic configuration and migration cycle tests."""

from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def _config(url: str) -> Config:
    root = Path(__file__).resolve().parents[1]
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "migrations"))
    config.set_main_option("prepend_sys_path", str(root / "src"))
    config.set_main_option("sqlalchemy.url", url)
    return config


def test_alembic_config_loads() -> None:
    root = Path(__file__).resolve().parents[1]
    config = Config(str(root / "alembic.ini"))
    assert config.get_main_option("script_location") == "migrations"


def test_alembic_upgrade_downgrade_cycle(tmp_path: Path) -> None:
    url = f"sqlite:///{tmp_path / 'alembic.db'}"
    config = _config(url)
    command.upgrade(config, "head")
    engine = create_engine(url)
    try:
        tables = set(inspect(engine).get_table_names())
        assert "datasets" in tables
        assert "staging_uploads" in tables
        assert "dataset_profiles" in tables
        assert "column_profiles" in tables
        assert "quality_issues" in tables
        assert "dataset_versions" in tables
        assert "transformations" in tables
        assert "workflows" in tables
        assert "workflow_steps" in tables
        assert "workflow_runs" in tables
        assert "jobs" in tables
        assert "job_attempts" in tables
        assert "worker_heartbeats" in tables
        assert "workflow_step_runs" in tables
        command.downgrade(config, "base")
        command.upgrade(config, "head")
        tables = set(inspect(engine).get_table_names())
        assert "datasets" in tables
    finally:
        engine.dispose()


def test_alembic_upgrade_backfills_existing_sqlite_dataset(tmp_path: Path) -> None:
    url = f"sqlite:///{tmp_path / 'existing.db'}"
    config = _config(url)
    command.upgrade(config, "003_phase4_profiles")
    dataset_id = uuid4()
    profile_id = uuid4()
    now = datetime.now(UTC).replace(tzinfo=None)
    engine = create_engine(url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO datasets (
                        id, name, original_filename, file_type, file_size, status,
                        row_count, column_count, storage_key, columns_json,
                        created_at, updated_at
                    ) VALUES (
                        :id, 'Customers', 'source.csv', 'csv', 128, 'ready',
                        12, 8, :storage_key, :columns_json, :created_at, :updated_at
                    )
                    """
                ),
                {
                    "id": str(dataset_id),
                    "storage_key": f"{dataset_id}/source.csv",
                    "columns_json": '[{"name": "email", "index": 0, "dtype": "text"}]',
                    "created_at": now,
                    "updated_at": now,
                },
            )
            connection.execute(
                text(
                    """
                    INSERT INTO dataset_profiles (
                        id, dataset_id, status, profile_version, stale,
                        issue_count, created_at, updated_at
                    ) VALUES (
                        :id, :dataset_id, 'READY', '1.0', 0, 0, :created_at, :updated_at
                    )
                    """
                ),
                {
                    "id": str(profile_id),
                    "dataset_id": str(dataset_id),
                    "created_at": now,
                    "updated_at": now,
                },
            )
        command.upgrade(config, "head")
        with engine.connect() as connection:
            version_count = connection.execute(
                text("SELECT COUNT(*) FROM dataset_versions")
            ).scalar_one()
            current_version = connection.execute(
                text("SELECT current_version_id FROM datasets WHERE id = :id"),
                {"id": dataset_id.hex},
            ).scalar_one()
            profile_version = connection.execute(
                text("SELECT version_id FROM dataset_profiles WHERE id = :id"),
                {"id": profile_id.hex},
            ).scalar_one()
        assert version_count == 1
        assert current_version is not None
        assert profile_version is not None
        tables = set(inspect(engine).get_table_names())
        assert "workflows" in tables

        from sqlalchemy.orm import Session

        from facilio.models.dataset import Dataset

        with Session(engine) as session:
            loaded = session.get(Dataset, dataset_id)
            assert loaded is not None
            assert loaded.current_version is not None
            assert loaded.current_version.version_number == 1
            assert loaded.current_version.profile is not None
    finally:
        engine.dispose()
