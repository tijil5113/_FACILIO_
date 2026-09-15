import { apiGet, apiPatch, apiPost } from "@/services/api-client";
import type {
  DatasetVersion,
  DatasetVersionDetail,
  Lineage,
  TransformationApplyResult,
  TransformationDefinition,
  TransformationPreview,
  TransformationRequest,
  VersionComparison,
  WorkspaceStats,
} from "@/types/transformations";
import type { DatasetPreview } from "@/types/dataset";
import type { DatasetProfile } from "@/types/profile";

const TRANSFORM_TIMEOUT_MS = 120_000;

export function listTransformations(): Promise<TransformationDefinition[]> {
  return apiGet<TransformationDefinition[]>("/api/v1/transformations");
}

export function listVersions(datasetId: string): Promise<DatasetVersion[]> {
  return apiGet<DatasetVersion[]>(`/api/v1/datasets/${datasetId}/versions`);
}

export function getVersion(
  datasetId: string,
  versionId: string,
): Promise<DatasetVersionDetail> {
  return apiGet<DatasetVersionDetail>(
    `/api/v1/datasets/${datasetId}/versions/${versionId}`,
  );
}

export function getVersionPreview(
  datasetId: string,
  versionId: string,
): Promise<DatasetPreview> {
  return apiGet<DatasetPreview>(
    `/api/v1/datasets/${datasetId}/versions/${versionId}/preview`,
  );
}

export function getVersionProfile(
  datasetId: string,
  versionId: string,
): Promise<DatasetProfile> {
  return apiGet<DatasetProfile>(
    `/api/v1/datasets/${datasetId}/versions/${versionId}/profile`,
  );
}

export function previewTransformation(
  datasetId: string,
  versionId: string,
  body: TransformationRequest,
): Promise<TransformationPreview> {
  return apiPost<TransformationPreview>(
    `/api/v1/datasets/${datasetId}/versions/${versionId}/transformations/preview`,
    body,
    TRANSFORM_TIMEOUT_MS,
  );
}

export function applyTransformation(
  datasetId: string,
  versionId: string,
  body: TransformationRequest,
): Promise<TransformationApplyResult> {
  return apiPost<TransformationApplyResult>(
    `/api/v1/datasets/${datasetId}/versions/${versionId}/transformations`,
    body,
    TRANSFORM_TIMEOUT_MS,
  );
}

export function getLineage(datasetId: string, versionId: string): Promise<Lineage> {
  return apiGet<Lineage>(`/api/v1/datasets/${datasetId}/versions/${versionId}/lineage`);
}

export function getVersionComparison(
  datasetId: string,
  versionId: string,
): Promise<VersionComparison> {
  return apiGet<VersionComparison>(
    `/api/v1/datasets/${datasetId}/versions/${versionId}/comparison`,
  );
}

export function setCurrentVersion(
  datasetId: string,
  versionId: string,
): Promise<DatasetVersionDetail> {
  return apiPatch<DatasetVersionDetail>(`/api/v1/datasets/${datasetId}/current-version`, {
    version_id: versionId,
  });
}

export function getWorkspaceStats(): Promise<WorkspaceStats> {
  return apiGet<WorkspaceStats>("/api/v1/workspace/summary");
}
