import { expect, test } from "vitest";

import type { DatasetProfile } from "@/types/profile";

import {
  problemCountLabel,
  resolveAnalysisState,
  resolveWorkspacePrimary,
  viewingDiffersFromUsing,
} from "./workspace-state";

const ready: DatasetProfile = {
  dataset_id: "d",
  status: "READY",
  profile_version: "1.0",
  profiled_at: null,
  stale: false,
  error_code: null,
  error_message: null,
  summary: null,
  columns: [],
  quality: null,
  issue_counts: { total: 2, critical: 0, warning: 1, info: 1 },
};

test("not analyzed is distinct from zero problems", () => {
  expect(
    resolveAnalysisState({ profile: null, analyzing: false, mutationFailed: false }),
  ).toBe("not_analyzed");
  expect(
    resolveAnalysisState({
      profile: { ...ready, issue_counts: { total: 0, critical: 0, warning: 0, info: 0 } },
      analyzing: false,
      mutationFailed: false,
    }),
  ).toBe("analyzed_no_problems");
});

test("failed analysis is distinct from not analyzed", () => {
  expect(
    resolveAnalysisState({
      profile: { ...ready, status: "FAILED" },
      analyzing: false,
      mutationFailed: false,
    }),
  ).toBe("failed");
});

test("analyzing wins over a stale not-profiled payload", () => {
  expect(
    resolveAnalysisState({
      profile: { ...ready, status: "NOT_PROFILED" },
      analyzing: true,
      mutationFailed: false,
    }),
  ).toBe("analyzing");
});

test("viewing differs from using only when both ids exist and disagree", () => {
  expect(viewingDiffersFromUsing("a", "a")).toBe(false);
  expect(viewingDiffersFromUsing("a", "b")).toBe(true);
  expect(viewingDiffersFromUsing(undefined, "b")).toBe(false);
});

test("next action prefers Use this version when viewing a different version", () => {
  expect(
    resolveWorkspacePrimary({
      analysis: "analyzed_with_problems",
      viewingDifferent: true,
      datasetReady: true,
    }).kind,
  ).toBe("use-version");
});

test("next action follows analysis state when viewing the using version", () => {
  expect(
    resolveWorkspacePrimary({
      analysis: "not_analyzed",
      viewingDifferent: false,
      datasetReady: true,
    }),
  ).toEqual({ kind: "analyze", label: "Analyze dataset" });
  expect(
    resolveWorkspacePrimary({
      analysis: "analyzed_with_problems",
      viewingDifferent: false,
      datasetReady: true,
    }).kind,
  ).toBe("review-problems");
  expect(
    resolveWorkspacePrimary({
      analysis: "analyzed_no_problems",
      viewingDifferent: false,
      datasetReady: true,
    }).kind,
  ).toBe("view-data");
});

test("problem count copy uses real counts", () => {
  expect(problemCountLabel(1)).toBe("1 thing worth reviewing");
  expect(problemCountLabel(8)).toBe("8 things worth reviewing");
});
