import { describe, expect, test } from "vitest";

import { ERROR_MAP } from "@/features/recovery/error-map";
import { claimsDataUnchanged, mapRecoveryError } from "@/features/recovery/map-error";
import { ApiClientError } from "@/types/api";

function err(code: string, message = "Technical message", status = 400) {
  return new ApiClientError({
    message,
    code,
    status,
    requestId: "req-123",
  });
}

describe("error mapping", () => {
  test("maps analysis failure with unchanged data", () => {
    const mapped = mapRecoveryError(err("PROFILE_FAILED"), {
      operation: "analyze",
      action: "Analyze dataset",
    });
    expect(mapped.title).toMatch(/couldn't analyze/i);
    expect(mapped.consequence).toMatch(/unchanged/i);
    expect(mapped.retrySafe).toBe(true);
    expect(mapped.learnHref).toBe("/learn#data");
    expect(mapped.requestId).toBe("req-123");
    expect(claimsDataUnchanged(mapped)).toBe(true);
  });

  test("maps upload format and file too large with configured limit", () => {
    const format = mapRecoveryError(err("UNSUPPORTED_FILE_TYPE", "", 415), {
      operation: "upload",
      action: "Upload file",
    });
    expect(format.title).toMatch(/couldn't add this file/i);
    expect(format.consequence).toMatch(/wasn't added/i);
    const large = mapRecoveryError(err("FILE_TOO_LARGE", "", 413), {
      operation: "upload",
      action: "Upload file",
      maxUploadSizeMb: 16,
    });
    expect(large.explanation).toContain("16 MB");
    expect(large.dataSafety).toBe("not-added");
  });

  test("maps cleanup conflict, stale preview, and no-op", () => {
    const conflict = mapRecoveryError(
      err(
        "CLEANUP_CONFLICT",
        "NORMALIZE_CASE lowercase and uppercase cannot both run",
        409,
      ),
      { operation: "preview", action: "Preview cleanup" },
    );
    expect(conflict.title).toMatch(/conflict/i);
    expect(conflict.explanation.toLowerCase()).not.toContain("normalize_case");
    expect(conflict.retrySafe).toBe(false);

    const stale = mapRecoveryError(err("CLEANUP_STALE", "", 409), {
      operation: "cleanup",
      action: "Apply cleanup",
    });
    expect(stale.title).toMatch(/out of date/i);
    expect(stale.consequence).toMatch(/no cleaned version/i);

    const noop = mapRecoveryError(err("CLEANUP_NOOP", "", 409), {
      operation: "preview",
      action: "Preview cleanup",
    });
    expect(noop.severity).toBe("info");
    expect(noop.retrySafe).toBe(false);
  });

  test("maps cleanup failure as atomic", () => {
    const mapped = mapRecoveryError(err("CLEANUP_FAILED", "", 500), {
      operation: "cleanup",
      action: "Apply cleanup",
    });
    expect(mapped.title).toMatch(/couldn't finish/i);
    expect(mapped.consequence).toMatch(/input version is unchanged/i);
    expect(mapped.dataSafety).toBe("not-created");
  });

  test("unknown errors do not claim data was unchanged", () => {
    const mapped = mapRecoveryError(err("SOME_NEW_CODE", "boom", 500), {
      operation: "cleanup",
      action: "Apply cleanup",
    });
    expect(mapped.title).toMatch(/something prevented FACILIO/i);
    expect(mapped.consequence).toBe("No result was confirmed.");
    expect(mapped.dataSafety).toBe("unknown");
    expect(claimsDataUnchanged(mapped)).toBe(false);
  });

  test("not found mappings", () => {
    expect(ERROR_MAP.DATASET_NOT_FOUND?.title).toMatch(/couldn't find this dataset/i);
    expect(ERROR_MAP.WORKFLOW_NOT_FOUND?.title).toMatch(/couldn't find this Cleanup/i);
    expect(ERROR_MAP.JOB_NOT_FOUND?.title).toMatch(/couldn't find this Activity/i);
  });

  test("network fallback", () => {
    const mapped = mapRecoveryError(err("NETWORK_ERROR", "", 0), {
      operation: "load",
      action: "Load datasets",
    });
    expect(mapped.title).toMatch(/can't reach the data service/i);
    expect(mapped.retrySafe).toBe(true);
  });
});
