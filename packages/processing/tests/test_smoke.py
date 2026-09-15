"""Processing package smoke tests."""

from facilio_processing import __version__, get_engine_info
from facilio_processing.engine import runtime_library_versions


def test_package_version() -> None:
    assert __version__ == "0.1.0"


def test_get_engine_info() -> None:
    info = get_engine_info()
    assert info.name == "facilio-processing"
    assert info.version == "0.1.0"
    assert info.status == "workflows"


def test_pandas_is_importable() -> None:
    versions = runtime_library_versions()
    assert "pandas" in versions
    assert versions["pandas"]
