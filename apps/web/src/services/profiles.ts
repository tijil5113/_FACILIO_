import { apiGet, apiPost } from "@/services/api-client";
import type {
  DatasetProfile,
  QualityIssueList,
  QualityOverview,
  QualitySummary,
} from "@/types/profile";

const PROFILE_TIMEOUT_MS = 120_000;

export function getDatasetProfile(datasetId: string): Promise<DatasetProfile> {
  return apiGet<DatasetProfile>(`/api/v1/datasets/${datasetId}/profile`);
}

export function runDatasetProfile(
  datasetId: string,
  versionId?: string,
): Promise<DatasetProfile> {
  const search = versionId ? `?version=${encodeURIComponent(versionId)}` : "";
  return apiPost<DatasetProfile>(
    `/api/v1/datasets/${datasetId}/profile${search}`,
    undefined,
    PROFILE_TIMEOUT_MS,
  );
}

export function getDatasetQuality(
  datasetId: string,
  versionId?: string,
): Promise<QualitySummary> {
  const search = versionId ? `?version=${encodeURIComponent(versionId)}` : "";
  return apiGet<QualitySummary>(`/api/v1/datasets/${datasetId}/quality${search}`);
}

export function getDatasetIssues(
  datasetId: string,
  params?: {
    page?: number;
    pageSize?: number;
    severity?: string;
    category?: string;
    column?: string;
    version?: string;
  },
): Promise<QualityIssueList> {
  const search = new URLSearchParams();
  search.set("page", String(params?.page ?? 1));
  search.set("page_size", String(params?.pageSize ?? 50));
  if (params?.severity) {
    search.set("severity", params.severity);
  }
  if (params?.category) {
    search.set("category", params.category);
  }
  if (params?.column) {
    search.set("column", params.column);
  }
  if (params?.version) {
    search.set("version", params.version);
  }
  return apiGet<QualityIssueList>(
    `/api/v1/datasets/${datasetId}/issues?${search.toString()}`,
  );
}

export function getQualityOverview(): Promise<QualityOverview> {
  return apiGet<QualityOverview>("/api/v1/quality/summary");
}
