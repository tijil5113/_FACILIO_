"""FACILIO processing engine.

Phase 3 provides CSV, XLSX, and JSON readers. Phase 4 adds a deterministic
profiling and quality engine. Phase 5 adds registered, previewable
transformations. Phase 6 adds linear workflow orchestration on that same
registry. Source files are never cleaned or overwritten.
"""

from facilio_processing.engine import (
    EngineInfo,
    get_engine_info,
    inspect_workbook,
    preview_dataset,
    preview_frame,
    profile_dataset,
    profile_table,
    read_dataset,
    runtime_library_versions,
)
from facilio_processing.profiling import PROFILE_VERSION, ProfileLimits
from facilio_processing.readers.registry import get_reader, supported_file_types

__version__ = "0.1.0"

__all__ = [
    "EngineInfo",
    "PROFILE_VERSION",
    "ProfileLimits",
    "__version__",
    "get_engine_info",
    "get_reader",
    "inspect_workbook",
    "preview_dataset",
    "preview_frame",
    "profile_dataset",
    "profile_table",
    "read_dataset",
    "runtime_library_versions",
    "supported_file_types",
]
