import { describe, expect, test } from "vitest";

import { classifyHome } from "@/features/overview/home-state";
import type { DatasetSummary } from "@/types/dataset";

const sample = { id: "s", name: "Sample", is_sample: true } as DatasetSummary;

describe("classifyHome", () => {
  test("uses workspace counts so a sample-first page cannot hide user data", () => {
    expect(
      classifyHome({
        datasetsPending: false,
        datasetsFailed: false,
        apiDown: false,
        items: [sample],
        userDatasetCount: 3,
        sampleDatasetCount: 1,
      }),
    ).toBe("returning");
  });

  test("is sample-only when counts show only the sample", () => {
    expect(
      classifyHome({
        datasetsPending: false,
        datasetsFailed: false,
        apiDown: false,
        items: [sample],
        userDatasetCount: 0,
        sampleDatasetCount: 1,
      }),
    ).toBe("sample-only");
  });

  test("is empty when both counts are zero", () => {
    expect(
      classifyHome({
        datasetsPending: false,
        datasetsFailed: false,
        apiDown: false,
        items: [],
        userDatasetCount: 0,
        sampleDatasetCount: 0,
      }),
    ).toBe("empty");
  });
});
