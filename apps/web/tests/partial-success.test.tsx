import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, test } from "vitest";

import { CleanupResult } from "@/features/cleanup/CleanupResult";
import type { CleanupApplyResult } from "@/types/cleanup";

const result: CleanupApplyResult = {
  dataset_id: "d1",
  input_version_id: "v1",
  input_version_number: 1,
  output_version_id: "v2",
  output_version_number: 2,
  plan_fingerprint: "fp",
  impact: null,
  quality_delta: null,
  profile_status: "FAILED",
  job: {
    id: "job-1",
    status: "SUCCEEDED",
    workflow_name: "Guided cleanup",
    current_activity: "Done",
    progress: { current: 1, total: 1, label: "Done" },
  },
  workflow_run: {
    id: "run-1",
    status: "SUCCEEDED",
    quality_before: null,
    quality_after: null,
  },
  original_unchanged: true,
};

test("output analysis failure is partial success, not cleanup failure", () => {
  render(
    <MemoryRouter>
      <CleanupResult
        result={result}
        steps={[]}
        profiling={false}
        onCompare={() => undefined}
        onOpenData={() => undefined}
        onSave={() => undefined}
        onDone={() => undefined}
        onRetryProfile={() => undefined}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: "Cleanup complete" })).toBeInTheDocument();
  expect(
    screen.getByText(/cleaned version was created successfully/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/couldn't finish analyzing the new version/i),
  ).toBeInTheDocument();
  expect(screen.queryByText(/this cleanup couldn't finish/i)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try analysis again" })).toBeInTheDocument();
});
