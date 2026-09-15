import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api-client";
import type { JobSummary } from "@/types/jobs";
import type {
  RunListFilters,
  WorkflowDetail,
  WorkflowInput,
  WorkflowListResponse,
  WorkflowPreview,
  WorkflowRun,
  WorkflowRunListResponse,
  WorkflowValidation,
} from "@/types/workflows";

const RUN_TIMEOUT_MS = 120_000;

export function listWorkflows(
  page = 1,
  pageSize = 20,
  includeArchived = false,
): Promise<WorkflowListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    include_archived: includeArchived ? "true" : "false",
  });
  return apiGet<WorkflowListResponse>(`/api/v1/workflows?${params.toString()}`);
}

export function getWorkflow(workflowId: string): Promise<WorkflowDetail> {
  return apiGet<WorkflowDetail>(`/api/v1/workflows/${workflowId}`);
}

export function createWorkflow(body: {
  name: string;
  description?: string | null;
  steps?: Array<{
    operation_code: string;
    parameters?: Record<string, unknown>;
    enabled?: boolean;
  }>;
}): Promise<WorkflowDetail> {
  return apiPost<WorkflowDetail>("/api/v1/workflows", body);
}

export function patchWorkflow(
  workflowId: string,
  body: { name?: string; description?: string | null; expected_revision?: number },
): Promise<WorkflowDetail> {
  return apiPatch<WorkflowDetail>(`/api/v1/workflows/${workflowId}`, body);
}

export function deleteWorkflow(workflowId: string): Promise<{
  id: string;
  deleted: boolean;
  archived: boolean;
}> {
  return apiDelete(`/api/v1/workflows/${workflowId}`);
}

export function archiveWorkflow(workflowId: string): Promise<WorkflowDetail> {
  return apiPost<WorkflowDetail>(`/api/v1/workflows/${workflowId}/archive`);
}

export function restoreWorkflow(workflowId: string): Promise<WorkflowDetail> {
  return apiPost<WorkflowDetail>(`/api/v1/workflows/${workflowId}/restore`);
}

export function duplicateWorkflow(workflowId: string): Promise<WorkflowDetail> {
  return apiPost<WorkflowDetail>(`/api/v1/workflows/${workflowId}/duplicate`);
}

export function addWorkflowStep(
  workflowId: string,
  body: {
    operation_code: string;
    parameters?: Record<string, unknown>;
    enabled?: boolean;
    expected_revision?: number;
  },
): Promise<WorkflowDetail> {
  return apiPost<WorkflowDetail>(`/api/v1/workflows/${workflowId}/steps`, body);
}

export function patchWorkflowStep(
  workflowId: string,
  stepId: string,
  body: {
    parameters?: Record<string, unknown>;
    enabled?: boolean;
    operation_code?: string;
    expected_revision?: number;
  },
): Promise<WorkflowDetail> {
  return apiPatch<WorkflowDetail>(
    `/api/v1/workflows/${workflowId}/steps/${stepId}`,
    body,
  );
}

export function deleteWorkflowStep(
  workflowId: string,
  stepId: string,
): Promise<WorkflowDetail> {
  return apiDelete<WorkflowDetail>(`/api/v1/workflows/${workflowId}/steps/${stepId}`);
}

export function reorderWorkflowSteps(
  workflowId: string,
  stepIds: string[],
  expectedRevision?: number,
): Promise<WorkflowDetail> {
  return apiPost<WorkflowDetail>(`/api/v1/workflows/${workflowId}/steps/reorder`, {
    step_ids: stepIds,
    expected_revision: expectedRevision,
  });
}

export function validateWorkflow(
  workflowId: string,
  input?: WorkflowInput,
): Promise<WorkflowValidation> {
  return apiPost<WorkflowValidation>(
    `/api/v1/workflows/${workflowId}/validate`,
    input ?? {},
  );
}

export function previewWorkflow(
  workflowId: string,
  input: WorkflowInput,
): Promise<WorkflowPreview> {
  return apiPost<WorkflowPreview>(
    `/api/v1/workflows/${workflowId}/preview`,
    input,
    RUN_TIMEOUT_MS,
  );
}

export interface WorkflowRunAccepted {
  workflow_run: WorkflowRun;
  job: JobSummary;
}

export function runWorkflow(
  workflowId: string,
  input: WorkflowInput,
): Promise<WorkflowRunAccepted> {
  return apiPost<WorkflowRunAccepted>(`/api/v1/workflows/${workflowId}/runs`, input);
}

export function listWorkflowRuns(
  filters: RunListFilters = {},
): Promise<WorkflowRunListResponse> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    page_size: String(filters.page_size ?? 20),
  });
  if (filters.workflow_id) {
    params.set("workflow_id", filters.workflow_id);
  }
  if (filters.dataset_id) {
    params.set("dataset_id", filters.dataset_id);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  return apiGet<WorkflowRunListResponse>(`/api/v1/workflow-runs?${params.toString()}`);
}

export function getWorkflowRun(runId: string): Promise<WorkflowRun> {
  return apiGet<WorkflowRun>(`/api/v1/workflow-runs/${runId}`);
}
