import { describe, expect, test } from "vitest";

import { compactHealthFromChecks } from "./compact-health";

describe("compactHealthFromChecks", () => {
  test("is limited when the worker is unavailable", () => {
    const result = compactHealthFromChecks({
      healthError: false,
      healthSuccess: true,
      databaseStatus: "ready",
      queueStatus: "ready",
      workerStatus: "unavailable",
    });
    expect(result.label).toBe("Limited");
    expect(result.detail).toContain("Background processing is unavailable");
  });

  test("is healthy only when API, queue, and worker are up", () => {
    const result = compactHealthFromChecks({
      healthError: false,
      healthSuccess: true,
      databaseStatus: "ready",
      queueStatus: "ready",
      workerStatus: "available",
    });
    expect(result.label).toBe("Healthy");
  });

  test("is unavailable when the API is down", () => {
    const result = compactHealthFromChecks({
      healthError: true,
      healthSuccess: false,
    });
    expect(result.label).toBe("Unavailable");
  });
});
