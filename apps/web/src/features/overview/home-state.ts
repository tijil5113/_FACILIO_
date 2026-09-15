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
