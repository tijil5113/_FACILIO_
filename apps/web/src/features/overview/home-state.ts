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
}): HomeKind {
  if (args.apiDown || args.datasetsFailed) {
    return "degraded";
  }
  if (args.datasetsPending && args.items === undefined) {
    return "loading";
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
