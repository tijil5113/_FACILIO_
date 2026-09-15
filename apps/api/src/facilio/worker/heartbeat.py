"""Periodic worker heartbeat. One loop per process, not per job."""

from __future__ import annotations

import threading
from collections.abc import Callable

from facilio.core.logging import get_logger

logger = get_logger("facilio.worker.heartbeat")


class HeartbeatLoop:
    """Call `beat` immediately, then on `interval_seconds` until `stop`."""

    def __init__(
        self,
        interval_seconds: float,
        beat: Callable[[], None],
        *,
        stop_event: threading.Event | None = None,
    ) -> None:
        if interval_seconds <= 0:
            raise ValueError("heartbeat interval must be positive")
        self._interval = interval_seconds
        self._beat = beat
        self._stop = stop_event or threading.Event()
        self._thread: threading.Thread | None = None
        self.beats = 0

    def start(self) -> None:
        if self._thread is not None:
            return
        self._thread = threading.Thread(
            target=self._run, name="facilio-heartbeat", daemon=True
        )
        self._thread.start()

    def stop(self, timeout: float = 2.0) -> None:
        self._stop.set()
        thread = self._thread
        if thread is not None:
            thread.join(timeout=timeout)
        self._thread = None

    def _run(self) -> None:
        self._safe_beat()
        while not self._stop.wait(self._interval):
            self._safe_beat()

    def _safe_beat(self) -> None:
        try:
            self._beat()
            self.beats += 1
        except Exception:
            logger.exception("worker heartbeat failed")
