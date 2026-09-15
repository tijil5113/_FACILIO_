import { ApiClientError } from "@/types/api";
import { learnPath } from "@/features/learn/learn-topics";

import { ERROR_MAP, UNKNOWN_FALLBACK } from "./error-map";
import type {
  DataSafety,
  RecoveryContext,
  RecoveryExperience,
  RecoveryOperation,
} from "./types";

const OPERATION_CONSEQUENCE: Record<RecoveryOperation, string> = {
  upload: "The file wasn't added.",
  analyze: "Your dataset is still available and unchanged.",
  preview: "No cleaned version was created.",
  cleanup: "No result was confirmed.",
  "save-cleanup": "Your cleaned version is available. The reusable Cleanup wasn't saved.",
  "workflow-run": "No result was confirmed.",
  load: "Nothing on this page was changed.",
  delete: "No result was confirmed.",
  sample: "The sample wasn't added.",
  generic: "No result was confirmed.",
};

const OPERATION_SAFETY: Record<RecoveryOperation, DataSafety> = {
  upload: "not-added",
  analyze: "unchanged",
  preview: "not-created",
  cleanup: "unknown",
  "save-cleanup": "partial-save",
  "workflow-run": "unknown",
  load: "unchanged",
  delete: "unknown",
  sample: "not-added",
  generic: "unknown",
};

function humanConflictExplanation(message: string): string {
  const lowered = message.toLowerCase();
  if (lowered.includes("lowercase") && lowered.includes("uppercase")) {
    return "Two selected steps would make the same column both lowercase and uppercase.";
  }
  if (lowered.includes("fill") && lowered.includes("drop")) {
    return "FACILIO cannot fill missing values and also drop those rows in the same cleanup.";
  }
  if (message && !/[A-Z_]{4,}/.test(message)) {
    return message;
  }
  return "These steps cannot both be applied to the same column in one cleanup.";
}

function fileTooLargeExplanation(maxUploadSizeMb?: number): string {
  if (maxUploadSizeMb && maxUploadSizeMb > 0) {
    return `This file is larger than FACILIO's current ${String(maxUploadSizeMb)} MB upload limit.`;
  }
  return "This file is larger than FACILIO's current upload limit.";
}

export function mapRecoveryError(
  error: unknown,
  context: RecoveryContext,
): RecoveryExperience {
  const apiError = error instanceof ApiClientError ? error : null;
  const code = apiError?.code;
  const mapped = code ? ERROR_MAP[code] : undefined;
  const fallback = mapped ?? UNKNOWN_FALLBACK;
  const known = Boolean(mapped);

  let explanation = fallback.explanation;
  if (code === "FILE_TOO_LARGE") {
    explanation = fileTooLargeExplanation(context.maxUploadSizeMb);
  }
  if (code === "CLEANUP_CONFLICT" && apiError?.message) {
    explanation = humanConflictExplanation(apiError.message);
  }

  const dataSafety =
    fallback.dataSafety ?? (known ? OPERATION_SAFETY[context.operation] : "unknown");
  const consequence =
    fallback.consequence ??
    (dataSafety === "unknown"
      ? "No result was confirmed."
      : OPERATION_CONSEQUENCE[context.operation]);

  return {
    title: fallback.title,
    explanation,
    consequence,
    severity: fallback.severity ?? "error",
    retrySafe: fallback.retrySafe ?? (!known && context.operation !== "delete"),
    learnHref: fallback.learnHref,
    learnLabel: fallback.learnLabel,
    code,
    requestId: apiError?.requestId,
    status: apiError?.status,
    message: error instanceof Error ? error.message : undefined,
    action: context.action,
    resourceId: context.resourceId,
    dataSafety,
  };
}

export function analyzeFailureExperience(error?: unknown): RecoveryExperience {
  if (error) {
    return mapRecoveryError(error, {
      operation: "analyze",
      action: "Analyze dataset",
    });
  }
  return {
    title: "We couldn't finish analyzing this version",
    explanation: "FACILIO couldn't complete analysis of this version.",
    consequence: "Your data is still available and unchanged.",
    severity: "error",
    retrySafe: true,
    learnHref: learnPath("data"),
    learnLabel: "What Analyze does",
    action: "Analyze dataset",
    dataSafety: "unchanged",
  };
}

export function resourceNotFoundExperience(
  resource: "dataset" | "cleanup" | "activity",
  error?: unknown,
): RecoveryExperience {
  const operation: RecoveryContext = {
    operation: "load",
    action: `Load ${resource}`,
    resource,
  };
  if (error) {
    return mapRecoveryError(error, operation);
  }
  if (resource === "dataset") {
    return {
      title: "We couldn't find this dataset",
      explanation: "It may have been deleted, or the link may no longer be valid.",
      consequence: "No dataset was changed.",
      severity: "error",
      retrySafe: false,
      action: "Load dataset",
      dataSafety: "unchanged",
    };
  }
  if (resource === "cleanup") {
    return {
      title: "We couldn't find this Cleanup",
      explanation: "It may have been deleted, or the link may no longer be valid.",
      consequence: "No Cleanup was changed.",
      severity: "error",
      retrySafe: false,
      action: "Load cleanup",
      dataSafety: "unchanged",
    };
  }
  return {
    title: "We couldn't find this Activity item",
    explanation: "It may have been deleted, or the link may no longer be valid.",
    consequence: "No cleanup was started from this page.",
    severity: "error",
    retrySafe: false,
    action: "Load activity",
    dataSafety: "unchanged",
  };
}

export function claimsDataUnchanged(experience: RecoveryExperience): boolean {
  return (
    experience.dataSafety === "unchanged" ||
    experience.dataSafety === "not-added" ||
    experience.dataSafety === "not-created"
  );
}
