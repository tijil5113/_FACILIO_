import { describe, expect, test } from "vitest";

import { groupActivityByDate } from "./activity-groups";
import { executionStory } from "./execution-story";

describe("groupActivityByDate", () => {
  test("groups timestamps into today, yesterday, and earlier", () => {
    const now = new Date("2026-09-16T15:00:00.000Z");
    const groups = groupActivityByDate(
      [
        { id: "1", at: "2026-09-16T12:00:00.000Z" },
        { id: "2", at: "2026-09-15T12:00:00.000Z" },
        { id: "3", at: "2026-09-01T12:00:00.000Z" },
      ],
      (item) => item.at,
      now,
    );
    expect(
      groups.map((group) => [group.label, group.items.map((item) => item.id)]),
    ).toEqual([
      ["Today", ["1"]],
      ["Yesterday", ["2"]],
      ["Earlier", ["3"]],
    ]);
  });
});

describe("executionStory", () => {
  test("only includes stages that actually occurred", () => {
    expect(
      executionStory({
        queued_at: "2026-09-16T12:00:00.000Z",
        started_at: null,
        completed_at: "2026-09-16T12:00:01.000Z",
        status: "FAILED",
        error_code: "QUEUE_DISPATCH_FAILED",
      }).map((stage) => stage.label),
    ).toEqual(["Requested", "Failed to start"]);
  });

  test("shows started and completed when timestamps exist", () => {
    expect(
      executionStory({
        queued_at: "2026-09-16T12:00:00.000Z",
        started_at: "2026-09-16T12:00:05.000Z",
        completed_at: "2026-09-16T12:00:20.000Z",
        status: "SUCCEEDED",
      }).map((stage) => stage.label),
    ).toEqual(["Requested", "Started", "Completed"]);
  });
});
