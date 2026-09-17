import { profileStatusLabel } from "@/lib/status-labels";
import type { DatasetSummary } from "@/types/dataset";

export type HomeKind = "loading" | "degraded" | "empty" | "sample-only" | "returning";

export function isSampleDataset(dataset: DatasetSummary): boolean {
  return Boolean(dataset.is_sample);
}

export function classifyHome(args: {
  datasetsPending: boolean;
  datasetsFailed: boolean;
  apiDown: boolean;
  items: DatasetSummary[] | undefined;
  userDatasetCount?: number;
  sampleDatasetCount?: number;
}): HomeKind {
  if (args.apiDown || args.datasetsFailed) {
    return "degraded";
  }
  if (args.datasetsPending && args.items === undefined && args.userDatasetCount == null) {
    return "loading";
  }
  if (args.userDatasetCount != null) {
    if (args.userDatasetCount > 0) {
      return "returning";
    }
    if ((args.sampleDatasetCount ?? 0) > 0) {
      return "sample-only";
    }
    if (args.datasetsPending && args.sampleDatasetCount == null) {
      return "loading";
    }
    return "empty";
  }
  const items = args.items ?? [];
  if (items.length === 0) {
    return "empty";
  }
  if (items.every(isSampleDataset)) {
    return "sample-only";
  }
  return "returning";
}

export function featuredUserDataset(items: DatasetSummary[]): DatasetSummary | undefined {
  return items.find((item) => !isSampleDataset(item));
}

export function boundedRecentDatasets(
  items: DatasetSummary[],
  featuredId?: string,
  limit = 4,
): DatasetSummary[] {
  return items.filter((item) => item.id !== featuredId).slice(0, limit);
}

export function nextDatasetAction(dataset: DatasetSummary): {
  label: string;
  to: string;
} {
  if (dataset.status === "failed") {
    return { label: "Open dataset", to: `/datasets/${dataset.id}` };
  }
  if (dataset.profile_status === "NOT_PROFILED") {
    return { label: "Analyze", to: `/datasets/${dataset.id}?analyze=1` };
  }
  if (dataset.profile_status === "PROFILING") {
    return { label: "Continue", to: `/datasets/${dataset.id}` };
  }
  if (dataset.profile_status === "FAILED") {
    return { label: "Try analysis again", to: `/datasets/${dataset.id}?analyze=1` };
  }
  if ((dataset.issue_count ?? 0) > 0) {
    return { label: "Review problems", to: `/datasets/${dataset.id}?tab=problems` };
  }
  return { label: "View dataset", to: `/datasets/${dataset.id}` };
}

export function sampleDestination(
  dataset: Pick<DatasetSummary, "id" | "profile_status">,
): string {
  if (dataset.profile_status === "READY") {
    return `/datasets/${dataset.id}?tab=problems`;
  }
  return `/datasets/${dataset.id}?analyze=1`;
}

export function continueWorkingSummary(dataset: DatasetSummary): string {
  if (dataset.profile_status === "FAILED") {
    return profileStatusLabel("FAILED");
  }
  if (dataset.profile_status === "READY" && (dataset.issue_count ?? 0) > 0) {
    const count = dataset.issue_count ?? 0;
    return count === 1
      ? "1 problem detected"
      : `${count.toLocaleString()} problems detected`;
  }
  if (dataset.profile_status === "READY") {
    return "Analyzed — no detected problems";
  }
  if (dataset.profile_status === "PROFILING") {
    return "Analyzing";
  }
  return "Not analyzed";
}
