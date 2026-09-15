"""Data-quality public surface."""

from facilio_processing.quality.engine import evaluate_quality
from facilio_processing.quality.types import QualityResult

__all__ = ["QualityResult", "evaluate_quality"]
