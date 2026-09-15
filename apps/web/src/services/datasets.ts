import { apiDelete, apiGet, apiPatch, apiUpload } from "@/services/api-client";
import type { DatasetDetail, DatasetListResponse, DatasetPreview } from "@/types/dataset";

export function listDatasets(page = 1, pageSize = 20): Promise<DatasetListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return apiGet<DatasetListResponse>(`/api/v1/datasets?${params.toString()}`);
}

export function getDataset(datasetId: string): Promise<DatasetDetail> {
  return apiGet<DatasetDetail>(`/api/v1/datasets/${datasetId}`);
}

export function getDatasetPreview(datasetId: string): Promise<DatasetPreview> {
  return apiGet<DatasetPreview>(`/api/v1/datasets/${datasetId}/preview`);
}

export function uploadDataset(form: FormData): Promise<DatasetDetail> {
  return apiUpload<DatasetDetail>("/api/v1/datasets", form);
}

export function renameDataset(datasetId: string, name: string): Promise<DatasetDetail> {
  return apiPatch<DatasetDetail>(`/api/v1/datasets/${datasetId}`, { name });
}

export function deleteDataset(
  datasetId: string,
): Promise<{ id: string; deleted: boolean }> {
  return apiDelete(`/api/v1/datasets/${datasetId}`);
}
