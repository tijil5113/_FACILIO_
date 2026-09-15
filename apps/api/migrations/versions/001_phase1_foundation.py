"""Establish the Phase 1 migration chain.

Revision ID: 001_phase1_foundation
Revises:
Create Date: 2026-09-10

Phase 1 does not introduce product tables. This revision exists so
future dataset, workflow, and job models can migrate from a known head.
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "001_phase1_foundation"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
