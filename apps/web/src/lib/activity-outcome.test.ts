import { describe, expect, test } from "vitest";

import {
  activityHasOutput,
  activityOutcome,
  activityResultLabel,
} from "./activity-outcome";

describe("activityOutcome", () => {
  test("gives output version precedence over a failed job status", () => {
    const outcome = activityOutcome({
      status: "FAILED",
      output_version_id: "out",
      output_version_number: 2,
      output_profile_status: "FAILED",
    });
    expect(outcome.kind).toBe("partial_success");
    expect(outcome.headline).toBe("Cleaned version created");
    expect(outcome.detail).toContain("Analysis needs attention");
    expect(activityHasOutput({ output_version_id: "out" })).toBe(true);
  });

  test("reports success when a version exists and analysis succeeded", () => {
    expect(
      activityResultLabel({
        status: "SUCCEEDED",
        output_version_id: "out",
        output_version_number: 2,
        output_profile_status: "READY",
      }),
    ).toBe("Cleaned version created · V2");
  });

  test("says no cleaned version only when cleanup failed without output", () => {
    const outcome = activityOutcome({
      status: "FAILED",
      output_version_id: null,
      output_version_number: null,
    });
    expect(outcome.headline).toBe("Couldn't create cleaned version");
    expect(outcome.hasOutput).toBe(false);
  });

  test("does not claim waiting when the worker is unavailable", () => {
    const outcome = activityOutcome(
      { status: "QUEUED", output_version_id: null },
      { workerAvailable: false },
    );
    expect(outcome.kind).toBe("worker_unavailable");
    expect(outcome.headline).toContain("can't start");
  });

  test("describes queued and running jobs without fake completion", () => {
    expect(
      activityOutcome({
        status: "QUEUED",
        output_version_id: null,
      }).headline,
    ).toBe("Waiting");
    expect(
      activityOutcome({
        status: "RUNNING",
        output_version_id: null,
        current_activity: "Executing step 2 of 4",
        progress: { current: 2, total: 4, label: "2 of 4 steps complete" },
      }).headline,
    ).toBe("Running");
  });

  test("does not treat succeeded-without-output as a cleaned version", () => {
    const outcome = activityOutcome({
      status: "SUCCEEDED",
      output_version_id: null,
      output_version_number: null,
    });
    expect(outcome.kind).toBe("failed");
    expect(outcome.hasOutput).toBe(false);
  });
});
