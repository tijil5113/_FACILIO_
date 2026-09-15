"""Shared pagination bounds for collection endpoints."""

from __future__ import annotations

from facilio.core.errors import AppError

MAX_PAGE_SIZE = 100


def parse_page(page: int, page_size: int) -> tuple[int, int]:
    if page < 1 or page_size < 1 or page_size > MAX_PAGE_SIZE:
        raise AppError(
            "VALIDATION_ERROR",
            "page must be >= 1 and page_size must be between 1 and 100.",
            status_code=422,
        )
    return page, page_size
