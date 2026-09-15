import type { DatasetStatus } from "@/types/dataset";
import type { WorkflowStatus } from "@/types/workflows";

export function datasetStatusLabel(status: DatasetStatus): string {
  if (status === "pending") return "Waiting";
  if (status === "processing") return "Working";
  if (status === "ready") return "Ready";
  return "Couldn't finish";
}

export function profileStatusLabel(status: string): string {
  if (status === "NOT_PROFILED") return "Not analyzed";
  if (status === "PROFILING") return "Analyzing";
  if (status === "READY") return "Analyzed";
  if (status === "FAILED") return "Analysis didn't finish";
  return status.replaceAll("_", " ");
}

export function workflowStatusLabel(status: WorkflowStatus): string {
  if (status === "DRAFT") return "Draft";
  if (status === "READY") return "Ready";
  if (status === "INVALID") return "Needs attention";
  return "Archived";
}

export function jobStatusLabel(status: string): string {
  if (status === "QUEUED") return "Waiting to start";
  if (status === "RUNNING") return "Running";
  if (status === "SUCCEEDED") return "Done";
  if (status === "FAILED") return "Couldn't finish";
  if (status === "CANCEL_REQUESTED") return "Stopping";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "PENDING") return "Waiting";
  if (status === "SKIPPED") return "Skipped";
  return status.replaceAll("_", " ");
}

export function runStatusLabel(status: string): string {
  return jobStatusLabel(status);
}
