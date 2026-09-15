import { apiGet, apiPost } from "@/services/api-client";
import type {
  CleanupApplyResult,
  CleanupPreview,
  CleanupRecommendations,
  CleanupStep,
} from "@/types/cleanup";

const CLEANUP_TIMEOUT_MS = 120_000;

export function getCleanupRecommendations(
  datasetId: string,
  versionId: string,
): Promise<CleanupRecommendations> {
  return apiGet(
    `/api/v1/datasets/${datasetId}/versions/${versionId}/cleanup-recommendations`,
  );
}

export function previewCleanup(
  datasetId: string,
  versionId: string,
  steps: CleanupStep[],
): Promise<CleanupPreview> {
  return apiPost(
    `/api/v1/datasets/${datasetId}/versions/${versionId}/cleanup-preview`,
    { steps },
    CLEANUP_TIMEOUT_MS,
  );
}

export function applyCleanup(
  datasetId: string,
  versionId: string,
  body: {
    steps: CleanupStep[];
    plan_fingerprint: string;
    acknowledge_high_impact?: boolean;
  },
): Promise<CleanupApplyResult> {
  return apiPost(
    `/api/v1/datasets/${datasetId}/versions/${versionId}/cleanup`,
    body,
    CLEANUP_TIMEOUT_MS,
  );
}
