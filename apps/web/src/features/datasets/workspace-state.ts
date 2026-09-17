import { profileStatusLabel } from "@/lib/status-labels";
import type { DatasetProfile } from "@/types/profile";

export type WorkspaceAnalysis =
  | "not_analyzed"
  | "analyzing"
  | "failed"
  | "analyzed_with_problems"
  | "analyzed_no_problems";

export type WorkspacePrimaryKind =
  "analyze" | "retry-analyze" | "review-problems" | "view-data" | "use-version" | "none";

export interface WorkspacePrimary {
  kind: WorkspacePrimaryKind;
  label: string;
}

export function resolveAnalysisState(args: {
  profile: DatasetProfile | null;
  analyzing: boolean;
  mutationFailed: boolean;
}): WorkspaceAnalysis {
  if (args.analyzing || args.profile?.status === "PROFILING") {
    return "analyzing";
  }
  if (args.mutationFailed || args.profile?.status === "FAILED") {
    return "failed";
  }
  if (args.profile?.status === "READY") {
    return args.profile.issue_counts.total > 0
      ? "analyzed_with_problems"
      : "analyzed_no_problems";
  }
  return "not_analyzed";
}

export function viewingDiffersFromUsing(
  viewingId: string | undefined,
  usingId: string | null | undefined,
): boolean {
  if (!viewingId || !usingId) {
    return false;
  }
  return viewingId !== usingId;
}

export function resolveWorkspacePrimary(args: {
  analysis: WorkspaceAnalysis;
  viewingDifferent: boolean;
  datasetReady: boolean;
}): WorkspacePrimary {
  if (!args.datasetReady) {
    return { kind: "none", label: "" };
  }
  if (args.viewingDifferent) {
    return { kind: "use-version", label: "Use this version" };
  }
  if (args.analysis === "not_analyzed") {
    return { kind: "analyze", label: "Analyze dataset" };
  }
  if (args.analysis === "analyzing") {
    return { kind: "analyze", label: "Analyzing…" };
  }
  if (args.analysis === "failed") {
    return { kind: "retry-analyze", label: "Retry analysis" };
  }
  if (args.analysis === "analyzed_with_problems") {
    return { kind: "review-problems", label: "Review problems" };
  }
  return { kind: "view-data", label: "View data" };
}

export function problemCountLabel(count: number): string {
  if (count === 1) {
    return "1 thing worth reviewing";
  }
  return `${String(count)} things worth reviewing`;
}

export function analysisStateLabel(status: string | undefined): string {
  if (!status) {
    return profileStatusLabel("NOT_PROFILED");
  }
  return profileStatusLabel(status);
}
