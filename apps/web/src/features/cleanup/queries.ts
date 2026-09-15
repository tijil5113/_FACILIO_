import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { datasetKeys, qualityKeys, workspaceKeys } from "@/features/datasets/queries";
import { jobKeys } from "@/features/jobs/queries";
import { workflowKeys } from "@/features/workflows/queries";
import {
  applyCleanup,
  getCleanupRecommendations,
  previewCleanup,
} from "@/services/cleanup";
import type { CleanupStep } from "@/types/cleanup";

export const cleanupKeys = {
  all: ["cleanup"] as const,
  recommendations: (datasetId: string, versionId: string) =>
    [...cleanupKeys.all, "recommendations", datasetId, versionId] as const,
};

export function useCleanupRecommendationsQuery(
  datasetId: string | undefined,
  versionId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: cleanupKeys.recommendations(datasetId ?? "", versionId ?? ""),
    queryFn: () => getCleanupRecommendations(datasetId ?? "", versionId ?? ""),
    enabled: Boolean(datasetId && versionId) && enabled,
    retry: false,
  });
}

export function useCleanupPreviewMutation(datasetId: string, versionId: string) {
  return useMutation({
    mutationFn: (steps: CleanupStep[]) => previewCleanup(datasetId, versionId, steps),
  });
}

export function useCleanupApplyMutation(datasetId: string, versionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      steps: CleanupStep[];
      plan_fingerprint: string;
      acknowledge_high_impact?: boolean;
    }) => applyCleanup(datasetId, versionId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: datasetKeys.all }),
        queryClient.invalidateQueries({ queryKey: jobKeys.all }),
        queryClient.invalidateQueries({ queryKey: workflowKeys.all }),
        queryClient.invalidateQueries({ queryKey: qualityKeys.overview }),
        queryClient.invalidateQueries({ queryKey: workspaceKeys.summary }),
        queryClient.invalidateQueries({ queryKey: cleanupKeys.all }),
      ]);
    },
  });
}
