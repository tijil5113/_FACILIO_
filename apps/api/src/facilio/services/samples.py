"""Allowlisted bundled sample import.

Try FACILIO loads one server-controlled CSV through the normal ingestion
service. Callers cannot supply filesystem paths or remote URLs.
"""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from sqlalchemy.exc import IntegrityError
from werkzeug.datastructures import FileStorage

from facilio.core.config import Settings
from facilio.core.errors import AppError
from facilio.core.logging import get_logger
from facilio.db.session import Database
from facilio.schemas.datasets import DatasetDetail
from facilio.services.datasets import DatasetService

logger = get_logger("facilio.samples")

CUSTOMER_SAMPLE_KEY = "CUSTOMER_CLEANUP"
CUSTOMER_SAMPLE_FILENAME = "facilio-demo-customers.csv"
CUSTOMER_SAMPLE_NAME = "Sample: Customer data"


@dataclass(frozen=True)
class SampleSpec:
    sample_id: str
    sample_key: str
    filename: str
    display_name: str


_CUSTOMER = SampleSpec(
    sample_id="customers",
    sample_key=CUSTOMER_SAMPLE_KEY,
    filename=CUSTOMER_SAMPLE_FILENAME,
    display_name=CUSTOMER_SAMPLE_NAME,
)

ALLOWED_SAMPLES: dict[str, SampleSpec] = {
    "customers": _CUSTOMER,
    CUSTOMER_SAMPLE_KEY: _CUSTOMER,
}


class SampleService:
    def __init__(self, settings: Settings, database: Database) -> None:
        self._settings = settings
        self._database = database
        self._datasets = DatasetService(settings, database)

    def import_sample(self, sample_id: str) -> tuple[DatasetDetail, bool]:
        spec = ALLOWED_SAMPLES.get(sample_id)
        if spec is None:
            raise AppError(
                "SAMPLE_NOT_FOUND",
                "That sample is not available.",
                status_code=404,
            )
        existing = self._datasets.get_sample(spec.sample_key)
        if existing is not None:
            logger.info(
                "sample import reused dataset_id=%s sample_key=%s",
                existing.id,
                spec.sample_key,
            )
            return existing, False
        path = bundled_sample_path(spec.filename)
        data = path.read_bytes()
        upload = FileStorage(
            stream=BytesIO(data),
            filename=spec.filename,
            content_type="text/csv",
        )
        try:
            created = self._datasets.create_from_upload(
                upload,
                is_sample=True,
                sample_key=spec.sample_key,
                display_name=spec.display_name,
            )
        except IntegrityError:
            reused = self._datasets.get_sample(spec.sample_key)
            if reused is not None:
                logger.info(
                    "sample import raced dataset_id=%s sample_key=%s",
                    reused.id,
                    spec.sample_key,
                )
                return reused, False
            raise
        logger.info(
            "sample imported dataset_id=%s sample_key=%s",
            created.id,
            spec.sample_key,
        )
        return created, True


def bundled_sample_path(filename: str) -> Path:
    if Path(filename).name != filename or "/" in filename or "\\" in filename:
        raise AppError(
            "SAMPLE_NOT_FOUND",
            "That sample is not available.",
            status_code=404,
        )
    root = _sample_data_dir()
    path = (root / filename).resolve()
    try:
        path.relative_to(root)
    except ValueError as error:
        raise AppError(
            "SAMPLE_NOT_FOUND",
            "That sample is not available.",
            status_code=404,
        ) from error
    if not path.is_file():
        raise AppError(
            "SAMPLE_UNAVAILABLE",
            "The bundled sample file could not be read.",
            status_code=500,
        )
    return path


def _sample_data_dir() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = (parent / "sample-data").resolve()
        if candidate.is_dir():
            return candidate
    raise AppError(
        "SAMPLE_UNAVAILABLE",
        "The bundled sample file could not be read.",
        status_code=500,
    )
