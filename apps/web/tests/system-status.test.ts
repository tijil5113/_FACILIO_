import { describe, expect, test } from "vitest";

import {
  applicationPresentation,
  backgroundProcessingPresentation,
  humanDependencyStatus,
  safeTechnicalMessage,
} from "@/features/system-health/system-status";

describe("system status presentation", () => {
  test("does not infer healthy from API health when the worker is down", () => {
    const processing = backgroundProcessingPresentation({
      pending: false,
      operations: {
        queue: { status: "ready", backend: "redis", queued_count: 0, name: "workflows" },
        worker: { status: "unavailable", available_count: 0, last_seen_at: null },
        jobs: { queued: 0, running: 0, failed: 0, succeeded: 0 },
      },
    });
    expect(processing.label).toBe("Unavailable");
    expect(processing.consequence).toMatch(/saved Cleanups cannot start/i);
  });

  test("treats a live worker heartbeat as available", () => {
    const processing = backgroundProcessingPresentation({
      pending: false,
      operations: {
        queue: { status: "ready", backend: "redis", queued_count: 0, name: "workflows" },
        worker: {
          status: "available",
          available_count: 1,
          last_seen_at: "2026-09-16T12:00:00.000Z",
        },
        jobs: { queued: 0, running: 0, failed: 0, succeeded: 0 },
      },
    });
    expect(processing.label).toBe("Available");
    expect(processing.consequence).toBeNull();
    expect(processing.lastSeenAt).toBe("2026-09-16T12:00:00.000Z");
  });

  test("strips connection secrets from technical messages", () => {
    expect(safeTechnicalMessage("REDIS_URL is not set.")).toBeNull();
    expect(safeTechnicalMessage("Database accepted a connection.")).toBe(
      "Database accepted a connection.",
    );
    expect(humanDependencyStatus("ready").label).toBe("Available");
    expect(humanDependencyStatus("unavailable").label).toBe("Unavailable");
    expect(
      applicationPresentation({
        healthSuccess: false,
        healthError: true,
        healthPending: false,
      }).label,
    ).toBe("Unavailable");
  });
});
