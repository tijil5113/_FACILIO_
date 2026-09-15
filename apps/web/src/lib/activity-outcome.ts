import type { JobStatus, JobSummary } from "@/types/jobs";

export type ActivityOutcomeKind =
  "queued" | "running" | "created" | "created-analysis" | "none" | "stopped" | "pending";

export function activityResultLabel(item: {
  status: JobStatus;
  output_version_id?: string | null;
  output_version_number?: number | null;
  output_profile_status?: string | null;
  progress?: { label: string };
  current_activity?: string | null;
}): string {
  if (item.output_version_number != null) {
    if (
      item.output_profile_status === "FAILED" ||
      item.output_profile_status === "NOT_PROFILED"
    ) {
      return `V${String(item.output_version_number)} created · Analysis needs attention`;
    }
    return `V${String(item.output_version_number)} created`;
  }
  if (item.output_version_id) {
    return "Cleaned version created";
  }
  if (item.status === "SUCCEEDED") {
    return "Done";
  }
  if (item.status === "FAILED") {
    return "No new version";
  }
  if (item.status === "CANCELLED") {
    return "Stopped";
  }
  if (item.status === "QUEUED") {
    return "Waiting to start";
  }
  return item.current_activity || item.progress?.label || "Running";
}

export function activityHasOutput(item: Pick<JobSummary, "output_version_id">): boolean {
  return Boolean(item.output_version_id);
}

export function activityCleanupSucceeded(item: {
  status: JobStatus;
  output_version_id?: string | null;
}): boolean {
  return item.status === "SUCCEEDED" || Boolean(item.output_version_id);
}

export function activityAnalysisNeedsAttention(item: {
  output_version_id?: string | null;
  output_profile_status?: string | null;
}): boolean {
  if (!item.output_version_id) {
    return false;
  }
  return (
    item.output_profile_status === "FAILED" ||
    item.output_profile_status === "NOT_PROFILED"
  );
}
