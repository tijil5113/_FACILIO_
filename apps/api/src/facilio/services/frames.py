"""Load immutable version frames from managed storage."""

from __future__ import annotations

import pandas as pd

from facilio.core.errors import AppError
from facilio.models.dataset import Dataset
from facilio.models.version import DatasetVersion
from facilio.storage.local import LocalStorageService


def load_version_frame(
    storage: LocalStorageService,
    dataset: Dataset,
    version: DatasetVersion,
) -> pd.DataFrame:
    path = storage.resolve(version.storage_key)
    if not path.is_file():
        raise AppError(
            "INGESTION_FAILED",
            "The stored file for this version is no longer available.",
            status_code=500,
        )
    if version.kind == "ORIGINAL":
        from facilio_processing import read_dataset

        result = read_dataset(
            path,
            dataset.original_filename,
            sheet=dataset.selected_sheet,
            file_type=dataset.file_type,  # type: ignore[arg-type]
        )
        return result.frame
    from facilio_processing.table_store import read_table

    frame, _columns = read_table(path)
    return frame


def write_derived_table(
    storage: LocalStorageService,
    dataset_id,
    version_id,
    frame: pd.DataFrame,
) -> str:
    from facilio_processing.table_store import write_table

    key = f"{dataset_id}/versions/{version_id}/data.ftable.json"
    path = storage.resolve(key)
    write_table(path, frame)
    return key
