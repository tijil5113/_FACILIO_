import { describe, expect, test } from "vitest";

import {
  boundedRecentDatasets,
  classifyHome,
  continueWorkingSummary,
  featuredUserDataset,
  nextDatasetAction,
  sampleDestination,
} from "@/features/overview/home-state";
import type { DatasetSummary } from "@/types/dataset";

const sample = { id: "s", name: "Sample", is_sample: true } as DatasetSummary;
const user = { id: "u", name: "orders.csv", is_sample: false } as DatasetSummary;

function dataset(overrides: Partial<DatasetSummary>): DatasetSummary {
  return {
    id: "d1",
    name: "customers.csv",
    original_filename: "customers.csv",
    file_type: "csv",
    mime_type: "text/csv",
    file_size: 10,
    status: "ready",
    row_count: 10,
    column_count: 4,
    selected_sheet: null,
    encoding: "utf-8",
    delimiter: ",",
    created_at: "2026-09-14T12:00:00.000Z",
    updated_at: "2026-09-14T12:00:00.000Z",
    profile_status: "NOT_PROFILED",
    quality_score: null,
    quality_grade: null,
    profiled_at: null,
    current_version_id: "v1",
    current_version_number: 1,
    version_count: 1,
    is_sample: false,
    sample_key: null,
    issue_count: null,
    ...overrides,
  };
}

describe("classifyHome", () => {
  test("is loading until workspace state is known", () => {
    expect(
      classifyHome({
        datasetsPending: true,
        datasetsFailed: false,
        apiDown: false,
        items: undefined,
      }),
    ).toBe("loading");
  });

  test("is degraded when the data service cannot be reached", () => {
    expect(
      classifyHome({
        datasetsPending: false,
        datasetsFailed: true,
        apiDown: false,
        items: undefined,
      }),
    ).toBe("degraded");
    expect(
      classifyHome({
        datasetsPending: true,
        datasetsFailed: false,
        apiDown: true,
        items: undefined,
      }),
    ).toBe("degraded");
  });

  test("does not treat a failed request as first-run", () => {
    expect(
      classifyHome({
        datasetsPending: false,
        datasetsFailed: true,
        apiDown: false,
        items: [],
        userDatasetCount: 0,
        sampleDatasetCount: 0,
      }),
    ).toBe("degraded");
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

  test("is returning when sample and user data both exist", () => {
    expect(
      classifyHome({
        datasetsPending: false,
        datasetsFailed: false,
        apiDown: false,
        items: [sample, user],
        userDatasetCount: 1,
        sampleDatasetCount: 1,
      }),
    ).toBe("returning");
  });
});

describe("nextDatasetAction", () => {
  test("guides toward Analyze when the dataset is not analyzed", () => {
    expect(nextDatasetAction(dataset({ profile_status: "NOT_PROFILED" }))).toEqual({
      label: "Analyze",
      to: "/datasets/d1?analyze=1",
    });
  });

  test("does not invent a fix action when there are no problems", () => {
    expect(
      nextDatasetAction(dataset({ profile_status: "READY", issue_count: 0 })),
    ).toEqual({
      label: "View dataset",
      to: "/datasets/d1",
    });
  });

  test("reviews problems only when analysis found some", () => {
    expect(
      nextDatasetAction(dataset({ profile_status: "READY", issue_count: 6 })),
    ).toEqual({
      label: "Review problems",
      to: "/datasets/d1?tab=problems",
    });
  });

  test("recovers failed analysis without a zero quality score", () => {
    const failed = dataset({
      profile_status: "FAILED",
      quality_score: null,
      issue_count: null,
    });
    expect(nextDatasetAction(failed).label).toBe("Try analysis again");
    expect(continueWorkingSummary(failed)).toBe("Analysis didn't finish");
    expect(continueWorkingSummary(failed)).not.toMatch(/0/);
  });
});

describe("home helpers", () => {
  test("bounds recent datasets and prefers a real user dataset", () => {
    const extra = Array.from({ length: 8 }, (_, index) =>
      dataset({ id: `u${String(index)}`, name: `file-${String(index)}.csv` }),
    );
    const featured = featuredUserDataset([sample, ...extra]);
    expect(featured?.id).toBe("u0");
    expect(boundedRecentDatasets([sample, ...extra], featured?.id, 4)).toHaveLength(4);
  });

  test("sends analyzed samples to Problems", () => {
    expect(sampleDestination({ id: "s", profile_status: "READY" })).toBe(
      "/datasets/s?tab=problems",
    );
    expect(sampleDestination({ id: "s", profile_status: "NOT_PROFILED" })).toBe(
      "/datasets/s?analyze=1",
    );
  });
});
