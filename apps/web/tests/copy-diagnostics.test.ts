import { describe, expect, test } from "vitest";

import {
  diagnosticFields,
  formatDiagnostics,
} from "@/features/recovery/copy-diagnostics";
import type { RecoveryExperience } from "@/features/recovery/types";

const experience: RecoveryExperience = {
  title: "We couldn't analyze this data",
  explanation: "Analysis failed.",
  consequence: "Your dataset is still available and unchanged.",
  severity: "error",
  retrySafe: true,
  code: "PROFILE_FAILED",
  requestId: "abc-request",
  status: 500,
  action: "Analyze dataset",
  resourceId: "11111111-1111-4111-8111-111111111111",
  dataSafety: "unchanged",
};

describe("copy diagnostics", () => {
  test("includes safe diagnostic fields", () => {
    const text = formatDiagnostics(
      diagnosticFields(experience, new Date("2026-09-15T15:00:00.000Z")),
    );
    expect(text).toContain("FACILIO 0.1.0");
    expect(text).toContain("Action: Analyze dataset");
    expect(text).toContain("Error: PROFILE_FAILED");
    expect(text).toContain("Request ID: abc-request");
    expect(text).toContain("HTTP: 500");
    expect(text).toContain("Resource ID: 11111111-1111-4111-8111-111111111111");
    expect(text).toContain("Time: 2026-09-15T15:00:00.000Z");
  });

  test("does not copy secrets, auth, or dataset values", () => {
    const text = formatDiagnostics(diagnosticFields(experience));
    expect(text).not.toMatch(/SECRET_KEY|DATABASE_URL|REDIS_URL/i);
    expect(text).not.toMatch(/authorization|cookie/i);
    expect(text).not.toContain("Ada");
    expect(text).not.toContain("ACTIVE");
  });
});
