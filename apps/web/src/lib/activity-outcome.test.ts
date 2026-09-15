import { describe, expect, test } from "vitest";

import { activityResultLabel } from "./activity-outcome";

describe("activityResultLabel", () => {
  test("uses output version even when the job failed", () => {
    expect(
      activityResultLabel({
        status: "FAILED",
        output_version_id: "out",
        output_version_number: 2,
        output_profile_status: "FAILED",
      }),
    ).toBe("V2 created · Analysis needs attention");
  });

  test("reports a created version with a ready profile", () => {
    expect(
      activityResultLabel({
        status: "SUCCEEDED",
        output_version_id: "out",
        output_version_number: 2,
        output_profile_status: "READY",
      }),
    ).toBe("V2 created");
  });

  test("says no new version only when cleanup failed without output", () => {
    expect(
      activityResultLabel({
        status: "FAILED",
        output_version_id: null,
        output_version_number: null,
      }),
    ).toBe("No new version");
  });

  test("describes queued and running jobs", () => {
    expect(
      activityResultLabel({
        status: "QUEUED",
        output_version_id: null,
      }),
    ).toBe("Waiting to start");
    expect(
      activityResultLabel({
        status: "RUNNING",
        output_version_id: null,
        current_activity: "Executing step 2 of 4",
        progress: { label: "2 of 4 steps complete" },
      }),
    ).toBe("Executing step 2 of 4");
  });
});
