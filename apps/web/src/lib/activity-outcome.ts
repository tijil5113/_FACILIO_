import type { StatusTone } from "@/components/ui/StatusIndicator";
import type { JobStatus, JobSummary } from "@/types/jobs";

export type ActivityOutcomeKind =
  | "waiting"
  | "running"
  | "stopping"
  | "success"
  | "partial_success"
  | "failed"
  | "cancelled"
  | "worker_unavailable"
  | "stale";

export interface ActivityOutcome {
  kind: ActivityOutcomeKind;
  headline: string;
  detail: string;
  tone: StatusTone;
  hasOutput: boolean;
  analysisNeedsAttention: boolean;
}

type OutcomeInput = {
  status: JobStatus;
  output_version_id?: string | null;
  output_version_number?: number | null;
  output_profile_status?: string | null;
  error_code?: string | null;
  current_activity?: string | null;
  progress?: { current?: number; total?: number; label?: string };
};

export function activityHasOutput(item: {
  output_version_id?: string | null;
  output_version_number?: number | null;
}): boolean {
  return Boolean(item.output_version_id || item.output_version_number != null);
}

export function activityAnalysisNeedsAttention(item: {
  output_version_id?: string | null;
  output_version_number?: number | null;
  output_profile_status?: string | null;
}): boolean {
  if (!activityHasOutput(item)) {
    return false;
  }
  return (
    item.output_profile_status === "FAILED" ||
    item.output_profile_status === "NOT_PROFILED"
  );
}

function versionLabel(item: OutcomeInput): string | null {
  if (item.output_version_number != null) {
    return `V${String(item.output_version_number)}`;
  }
  return null;
}

export function activityOutcome(
  item: OutcomeInput,
  options?: { workerAvailable?: boolean },
): ActivityOutcome {
  const hasOutput = activityHasOutput(item);
  const analysisNeedsAttention = activityAnalysisNeedsAttention(item);
  const version = versionLabel(item);

  if (hasOutput) {
    if (analysisNeedsAttention) {
      return {
        kind: "partial_success",
        headline: "Cleaned version created",
        detail: version
          ? `${version} · Analysis needs attention`
          : "Analysis needs attention",
        tone: "warning",
        hasOutput: true,
        analysisNeedsAttention: true,
      };
    }
    return {
      kind: "success",
      headline: "Cleaned version created",
      detail: version ?? "Output is ready",
      tone: "success",
      hasOutput: true,
      analysisNeedsAttention: false,
    };
  }

  if (item.status === "CANCELLED") {
    return {
      kind: "cancelled",
      headline: "Cancelled",
      detail: "No cleaned version was created",
      tone: "warning",
      hasOutput: false,
      analysisNeedsAttention: false,
    };
  }

  if (item.status === "CANCEL_REQUESTED") {
    return {
      kind: "stopping",
      headline: "Stopping",
      detail: "FACILIO will stop after the current step",
      tone: "warning",
      hasOutput: false,
      analysisNeedsAttention: false,
    };
  }

  if (item.status === "FAILED") {
    const stale = item.error_code === "QUEUE_ORPHAN" || item.error_code === "WORKER_LOST";
    const enqueueFailed = item.error_code === "QUEUE_DISPATCH_FAILED";
    if (stale) {
      return {
        kind: "stale",
        headline: "Needs attention",
        detail: "This Cleanup did not finish. No cleaned version was created.",
        tone: "danger",
        hasOutput: false,
        analysisNeedsAttention: false,
      };
    }
    if (enqueueFailed) {
      return {
        kind: "failed",
        headline: "Couldn't start",
        detail: "FACILIO couldn't start this Cleanup. Your data has not been changed.",
        tone: "danger",
        hasOutput: false,
        analysisNeedsAttention: false,
      };
    }
    return {
      kind: "failed",
      headline: "Couldn't create cleaned version",
      detail: "Needs attention",
      tone: "danger",
      hasOutput: false,
      analysisNeedsAttention: false,
    };
  }

  if (item.status === "RUNNING") {
    const stepProgress =
      item.progress && (item.progress.total ?? 0) > 0
        ? item.progress.label
        : item.current_activity;
    return {
      kind: "running",
      headline: "Running",
      detail: stepProgress || "This Cleanup is in progress",
      tone: "info",
      hasOutput: false,
      analysisNeedsAttention: false,
    };
  }

  if (item.status === "QUEUED" && options?.workerAvailable === false) {
    return {
      kind: "worker_unavailable",
      headline: "Cleanup can't start right now",
      detail: "Background processing is unavailable. Your data has not been changed.",
      tone: "warning",
      hasOutput: false,
      analysisNeedsAttention: false,
    };
  }

  if (item.status === "QUEUED") {
    return {
      kind: "waiting",
      headline: "Waiting",
      detail: "FACILIO is waiting to start this Cleanup",
      tone: "neutral",
      hasOutput: false,
      analysisNeedsAttention: false,
    };
  }

  return {
    kind: "failed",
    headline: "Couldn't create cleaned version",
    detail: "Needs attention",
    tone: "danger",
    hasOutput: false,
    analysisNeedsAttention: false,
  };
}

export function activityResultLabel(
  item: OutcomeInput,
  options?: { workerAvailable?: boolean },
): string {
  const outcome = activityOutcome(item, options);
  if (outcome.kind === "success" || outcome.kind === "partial_success") {
    return outcome.detail.startsWith("V")
      ? `${outcome.headline} · ${outcome.detail}`
      : outcome.headline;
  }
  if (outcome.kind === "failed" && outcome.detail === "Needs attention") {
    return `${outcome.headline} · Needs attention`;
  }
  return outcome.headline;
}

export function activityCleanupSucceeded(item: {
  status: JobStatus;
  output_version_id?: string | null;
  output_version_number?: number | null;
}): boolean {
  return item.status === "SUCCEEDED" || activityHasOutput(item);
}

export function activityStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    QUEUED: "Waiting",
    RUNNING: "Running",
    SUCCEEDED: "Completed",
    FAILED: "Needs attention",
    CANCEL_REQUESTED: "Stopping",
    CANCELLED: "Cancelled",
  };
  return labels[status];
}

export type { JobSummary };
