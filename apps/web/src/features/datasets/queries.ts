import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteDataset,
  getDataset,
  getDatasetPreview,
  listDatasets,
  renameDataset,
  uploadDataset,
} from "@/services/datasets";
import { importCustomerSample } from "@/services/samples";
import {
  getDatasetIssues,
  getDatasetProfile,
  getQualityOverview,
  runDatasetProfile,
} from "@/services/profiles";
import {
  applyTransformation,
  getLineage,
  getVersionComparison,
  getVersionPreview,
  getVersionProfile,
  getWorkspaceStats,
  listTransformations,
  listVersions,
  previewTransformation,
  setCurrentVersion,
} from "@/services/transformations";
import { ApiClientError } from "@/types/api";

export const datasetKeys = {
  all: ["datasets"] as const,
  list: (page: number, pageSize: number) =>
    [...datasetKeys.all, "list", page, pageSize] as const,
  detail: (id: string) => [...datasetKeys.all, "detail", id] as const,
  preview: (id: string, versionId = "") =>
    [...datasetKeys.all, "preview", id, versionId] as const,
  profile: (id: string, versionId = "") =>
    [...datasetKeys.all, "profile", id, versionId] as const,
  quality: (id: string) => [...datasetKeys.all, "quality", id] as const,
  issues: (id: string, filters: string) =>
    [...datasetKeys.all, "issues", id, filters] as const,
  versions: (id: string) => [...datasetKeys.all, "versions", id] as const,
  lineage: (id: string, versionId: string) =>
    [...datasetKeys.all, "lineage", id, versionId] as const,
  comparison: (id: string, versionId: string) =>
    [...datasetKeys.all, "comparison", id, versionId] as const,
};

export const transformationKeys = {
  catalog: ["transformations", "catalog"] as const,
};

export const workspaceKeys = {
  summary: ["workspace", "summary"] as const,
};

export const qualityKeys = {
  overview: ["quality", "overview"] as const,
};

export function useDatasetsQuery(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: datasetKeys.list(page, pageSize),
    queryFn: () => listDatasets(page, pageSize),
    retry: false,
  });
}

export function useDatasetQuery(datasetId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.detail(datasetId ?? ""),
    queryFn: () => getDataset(datasetId ?? ""),
    enabled: Boolean(datasetId),
    retry: false,
  });
}

export function useDatasetPreviewQuery(
  datasetId: string | undefined,
  versionId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: datasetKeys.preview(datasetId ?? "", versionId ?? ""),
    queryFn: () =>
      versionId
        ? getVersionPreview(datasetId ?? "", versionId)
        : getDatasetPreview(datasetId ?? ""),
    enabled: Boolean(datasetId) && enabled,
    retry: false,
  });
}

export function useUploadDatasetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => uploadDataset(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: datasetKeys.all });
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.summary });
    },
  });
}

export function useImportCustomerSampleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => importCustomerSample(),
    onSuccess: async (dataset) => {
      queryClient.setQueryData(datasetKeys.detail(dataset.id), dataset);
      await queryClient.invalidateQueries({ queryKey: datasetKeys.all });
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.summary });
    },
  });
}

export function useRenameDatasetMutation(datasetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => renameDataset(datasetId, name),
    onSuccess: async (dataset) => {
      queryClient.setQueryData(datasetKeys.detail(datasetId), dataset);
      await queryClient.invalidateQueries({ queryKey: datasetKeys.all });
    },
  });
}

export function useDeleteDatasetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => deleteDataset(datasetId),
    onSuccess: async (_data, datasetId) => {
      queryClient.removeQueries({ queryKey: datasetKeys.detail(datasetId) });
      queryClient.removeQueries({ queryKey: datasetKeys.preview(datasetId) });
      queryClient.removeQueries({ queryKey: datasetKeys.profile(datasetId) });
      await queryClient.invalidateQueries({ queryKey: datasetKeys.all });
      await queryClient.invalidateQueries({ queryKey: qualityKeys.overview });
    },
  });
}

export function useDatasetProfileQuery(
  datasetId: string | undefined,
  versionId: string | undefined,
) {
  return useQuery({
    queryKey: datasetKeys.profile(datasetId ?? "", versionId ?? ""),
    queryFn: async () => {
      try {
        if (versionId) {
          return await getVersionProfile(datasetId ?? "", versionId);
        }
        return await getDatasetProfile(datasetId ?? "");
      } catch (error) {
        if (error instanceof ApiClientError && error.code === "PROFILE_NOT_FOUND") {
          return null;
        }
        throw error;
      }
    },
    enabled: Boolean(datasetId),
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === "PROFILING" ? 2000 : false),
  });
}

export function useProfileDatasetMutation(datasetId: string, versionId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runDatasetProfile(datasetId, versionId),
    onSuccess: async (profile) => {
      queryClient.setQueryData(datasetKeys.profile(datasetId, versionId ?? ""), profile);
      await queryClient.invalidateQueries({ queryKey: datasetKeys.detail(datasetId) });
      await queryClient.invalidateQueries({ queryKey: datasetKeys.all });
      await queryClient.invalidateQueries({ queryKey: qualityKeys.overview });
      await queryClient.invalidateQueries({
        queryKey: [...datasetKeys.all, "issues", datasetId],
      });
    },
  });
}

export function useDatasetIssuesQuery(
  datasetId: string | undefined,
  enabled: boolean,
  filters: { severity?: string; category?: string; column?: string; version?: string },
) {
  const key = JSON.stringify(filters);
  return useQuery({
    queryKey: datasetKeys.issues(datasetId ?? "", key),
    queryFn: () =>
      getDatasetIssues(datasetId ?? "", {
        severity: filters.severity,
        category: filters.category,
        column: filters.column,
        version: filters.version,
      }),
    enabled: Boolean(datasetId) && enabled,
    retry: false,
  });
}

export function useQualityOverviewQuery() {
  return useQuery({
    queryKey: qualityKeys.overview,
    queryFn: getQualityOverview,
    retry: false,
  });
}

export function useTransformationCatalogQuery() {
  return useQuery({
    queryKey: transformationKeys.catalog,
    queryFn: listTransformations,
    retry: false,
  });
}

export function useDatasetVersionsQuery(datasetId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.versions(datasetId ?? ""),
    queryFn: () => listVersions(datasetId ?? ""),
    enabled: Boolean(datasetId),
    retry: false,
  });
}

export function useLineageQuery(
  datasetId: string | undefined,
  versionId: string | undefined,
) {
  return useQuery({
    queryKey: datasetKeys.lineage(datasetId ?? "", versionId ?? ""),
    queryFn: () => getLineage(datasetId ?? "", versionId ?? ""),
    enabled: Boolean(datasetId && versionId),
    retry: false,
  });
}

export function useVersionComparisonQuery(
  datasetId: string | undefined,
  versionId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: datasetKeys.comparison(datasetId ?? "", versionId ?? ""),
    queryFn: () => getVersionComparison(datasetId ?? "", versionId ?? ""),
    enabled: Boolean(datasetId && versionId) && enabled,
    retry: false,
  });
}

export function useWorkspaceStatsQuery() {
  return useQuery({
    queryKey: workspaceKeys.summary,
    queryFn: getWorkspaceStats,
    retry: false,
  });
}

export function usePreviewTransformationMutation(datasetId: string, versionId: string) {
  return useMutation({
    mutationFn: (body: { operation: string; parameters: Record<string, unknown> }) =>
      previewTransformation(datasetId, versionId, body),
  });
}

export function useApplyTransformationMutation(datasetId: string, versionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { operation: string; parameters: Record<string, unknown> }) =>
      applyTransformation(datasetId, versionId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: datasetKeys.all });
      await queryClient.invalidateQueries({ queryKey: qualityKeys.overview });
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.summary });
    },
  });
}

export function useSetCurrentVersionMutation(datasetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => setCurrentVersion(datasetId, versionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: datasetKeys.all });
      await queryClient.invalidateQueries({ queryKey: qualityKeys.overview });
    },
  });
}
