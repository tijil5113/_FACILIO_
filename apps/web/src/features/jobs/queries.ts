import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { datasetKeys, qualityKeys, workspaceKeys } from "@/features/datasets/queries";
import { runKeys, workflowKeys } from "@/features/workflows/queries";
import {
  cancelJob,
  fetchOperationsHealth,
  getJob,
  listJobs,
  retryJob,
} from "@/services/jobs";
import type { JobFilters } from "@/types/jobs";
import { isActiveJobStatus } from "@/types/jobs";

export const jobKeys = {
  all: ["jobs"] as const,
  list: (filters: string) => [...jobKeys.all, "list", filters] as const,
  detail: (id: string) => [...jobKeys.all, "detail", id] as const,
  operations: ["operations", "health"] as const,
};

export function jobsListRefetchInterval(
  items: Array<{ status: Parameters<typeof isActiveJobStatus>[0] }>,
): number | false {
  return items.some((item) => isActiveJobStatus(item.status)) ? 2000 : false;
}

export function useJobsQuery(filters: JobFilters, enabled = true) {
  const key = JSON.stringify(filters);
  return useQuery({
    queryKey: jobKeys.list(key),
    queryFn: () => listJobs(filters),
    enabled,
    retry: false,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return jobsListRefetchInterval(items);
    },
  });
}

export function useJobQuery(jobId: string | undefined) {
  return useQuery({
    queryKey: jobKeys.detail(jobId ?? ""),
    queryFn: () => getJob(jobId ?? ""),
    enabled: Boolean(jobId),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || !isActiveJobStatus(status)) {
        return false;
      }
      return 1500;
    },
  });
}

export function useOperationsHealthQuery() {
  return useQuery({
    queryKey: jobKeys.operations,
    queryFn: fetchOperationsHealth,
    retry: false,
  });
}

function invalidateJobs(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: jobKeys.all }),
    queryClient.invalidateQueries({ queryKey: runKeys.all }),
    queryClient.invalidateQueries({ queryKey: workflowKeys.all }),
    queryClient.invalidateQueries({ queryKey: datasetKeys.all }),
    queryClient.invalidateQueries({ queryKey: qualityKeys.overview }),
    queryClient.invalidateQueries({ queryKey: workspaceKeys.summary }),
  ]);
}

export function useCancelJobMutation(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelJob(jobId),
    onSuccess: async (data) => {
      queryClient.setQueryData(jobKeys.detail(jobId), (current) =>
        current ? { ...current, ...data } : data,
      );
      await invalidateJobs(queryClient);
    },
  });
}

export function useRetryJobMutation(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => retryJob(jobId),
    onSuccess: async (data) => {
      queryClient.setQueryData(jobKeys.detail(jobId), (current) =>
        current ? { ...current, ...data } : data,
      );
      await invalidateJobs(queryClient);
    },
  });
}
