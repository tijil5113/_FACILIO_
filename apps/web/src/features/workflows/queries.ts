import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { datasetKeys, qualityKeys, workspaceKeys } from "@/features/datasets/queries";
import {
  addWorkflowStep,
  archiveWorkflow,
  createWorkflow,
  deleteWorkflow,
  deleteWorkflowStep,
  duplicateWorkflow,
  getWorkflow,
  getWorkflowRun,
  listWorkflowRuns,
  listWorkflows,
  patchWorkflow,
  patchWorkflowStep,
  previewWorkflow,
  reorderWorkflowSteps,
  restoreWorkflow,
  runWorkflow,
  validateWorkflow,
} from "@/services/workflows";
import type { RunListFilters, WorkflowInput } from "@/types/workflows";

export const workflowKeys = {
  all: ["workflows"] as const,
  list: (page: number, archived: boolean) =>
    [...workflowKeys.all, "list", page, archived] as const,
  detail: (id: string) => [...workflowKeys.all, "detail", id] as const,
  validation: (id: string, datasetId: string, versionId: string) =>
    [...workflowKeys.all, "validation", id, datasetId, versionId] as const,
};

export const runKeys = {
  all: ["workflow-runs"] as const,
  list: (filters: string) => [...runKeys.all, "list", filters] as const,
  detail: (id: string) => [...runKeys.all, "detail", id] as const,
};

export function useWorkflowsQuery(page = 1, includeArchived = false, enabled = true) {
  return useQuery({
    queryKey: workflowKeys.list(page, includeArchived),
    queryFn: () => listWorkflows(page, 20, includeArchived),
    enabled,
    retry: false,
  });
}

export function useWorkflowQuery(workflowId: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.detail(workflowId ?? ""),
    queryFn: () => getWorkflow(workflowId ?? ""),
    enabled: Boolean(workflowId),
    retry: false,
  });
}

export function useWorkflowValidationQuery(
  workflowId: string | undefined,
  input: WorkflowInput | undefined,
  revision: number | undefined,
) {
  return useQuery({
    queryKey: [
      ...workflowKeys.validation(
        workflowId ?? "",
        input?.dataset_id ?? "",
        input?.version_id ?? "",
      ),
      revision ?? 0,
    ],
    queryFn: () => validateWorkflow(workflowId ?? "", input),
    enabled: Boolean(workflowId),
    retry: false,
  });
}

export function useWorkflowRunsQuery(filters: RunListFilters) {
  const key = JSON.stringify(filters);
  return useQuery({
    queryKey: runKeys.list(key),
    queryFn: () => listWorkflowRuns(filters),
    retry: false,
  });
}

export function useWorkflowRunQuery(runId: string | undefined) {
  return useQuery({
    queryKey: runKeys.detail(runId ?? ""),
    queryFn: () => getWorkflowRun(runId ?? ""),
    enabled: Boolean(runId),
    retry: false,
  });
}

function invalidateWorkflows(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: workflowKeys.all }),
    queryClient.invalidateQueries({ queryKey: runKeys.all }),
    queryClient.invalidateQueries({ queryKey: workspaceKeys.summary }),
  ]);
}

export function useCreateWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string | null;
      steps?: Array<{
        operation_code: string;
        parameters?: Record<string, unknown>;
        enabled?: boolean;
      }>;
    }) => createWorkflow(body),
    onSuccess: async () => {
      await invalidateWorkflows(queryClient);
    },
  });
}

export function usePatchWorkflowMutation(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      description?: string | null;
      expected_revision?: number;
    }) => patchWorkflow(workflowId, body),
    onSuccess: async (data) => {
      queryClient.setQueryData(workflowKeys.detail(workflowId), data);
      await invalidateWorkflows(queryClient);
    },
  });
}

export function useAddStepMutation(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      operation_code: string;
      parameters?: Record<string, unknown>;
      expected_revision?: number;
    }) => addWorkflowStep(workflowId, body),
    onSuccess: async (data) => {
      queryClient.setQueryData(workflowKeys.detail(workflowId), data);
      await queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}

export function usePatchStepMutation(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      stepId: string;
      parameters?: Record<string, unknown>;
      enabled?: boolean;
      expected_revision?: number;
    }) =>
      patchWorkflowStep(workflowId, args.stepId, {
        parameters: args.parameters,
        enabled: args.enabled,
        expected_revision: args.expected_revision,
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(workflowKeys.detail(workflowId), data);
      await queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}

export function useDeleteStepMutation(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepId: string) => deleteWorkflowStep(workflowId, stepId),
    onSuccess: async (data) => {
      queryClient.setQueryData(workflowKeys.detail(workflowId), data);
      await queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}

export function useReorderStepsMutation(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { stepIds: string[]; expectedRevision?: number }) =>
      reorderWorkflowSteps(workflowId, args.stepIds, args.expectedRevision),
    onSuccess: (data) => {
      queryClient.setQueryData(workflowKeys.detail(workflowId), data);
    },
  });
}

export function usePreviewWorkflowMutation(workflowId: string) {
  return useMutation({
    mutationFn: (input: WorkflowInput) => previewWorkflow(workflowId, input),
  });
}

export function useRunWorkflowMutation(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkflowInput) => runWorkflow(workflowId, input),
    onSuccess: async () => {
      await invalidateWorkflows(queryClient);
      await queryClient.invalidateQueries({ queryKey: datasetKeys.all });
      await queryClient.invalidateQueries({ queryKey: qualityKeys.overview });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useArchiveWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => archiveWorkflow(workflowId),
    onSuccess: async () => {
      await invalidateWorkflows(queryClient);
    },
  });
}

export function useRestoreWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => restoreWorkflow(workflowId),
    onSuccess: async () => {
      await invalidateWorkflows(queryClient);
    },
  });
}

export function useDuplicateWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => duplicateWorkflow(workflowId),
    onSuccess: async () => {
      await invalidateWorkflows(queryClient);
    },
  });
}

export function useDeleteWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => deleteWorkflow(workflowId),
    onSuccess: async () => {
      await invalidateWorkflows(queryClient);
    },
  });
}
