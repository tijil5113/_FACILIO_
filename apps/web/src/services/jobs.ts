import { apiGet, apiPost } from "@/services/api-client";
import type {
  JobDetail,
  JobFilters,
  JobListResponse,
  OperationsHealth,
} from "@/types/jobs";

export function listJobs(filters: JobFilters = {}): Promise<JobListResponse> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    page_size: String(filters.page_size ?? 20),
  });
  if (filters.status) params.set("status", filters.status);
  if (filters.job_type) params.set("job_type", filters.job_type);
  if (filters.workflow_id) params.set("workflow_id", filters.workflow_id);
  if (filters.dataset_id) params.set("dataset_id", filters.dataset_id);
  if (filters.q) params.set("q", filters.q);
  return apiGet<JobListResponse>(`/api/v1/jobs?${params.toString()}`);
}

export function getJob(jobId: string): Promise<JobDetail> {
  return apiGet<JobDetail>(`/api/v1/jobs/${jobId}`);
}

export function cancelJob(jobId: string): Promise<JobDetail> {
  return apiPost<JobDetail>(`/api/v1/jobs/${jobId}/cancel`);
}

export function retryJob(jobId: string): Promise<JobDetail> {
  return apiPost<JobDetail>(`/api/v1/jobs/${jobId}/retry`);
}

export function fetchOperationsHealth(): Promise<OperationsHealth> {
  return apiGet<OperationsHealth>("/api/v1/operations/health");
}
