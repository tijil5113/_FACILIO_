export type JobType = "WORKFLOW_RUN";

export type JobStatus =
  "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCEL_REQUESTED" | "CANCELLED";

export type JobErrorCategory =
  "VALIDATION" | "DATA" | "INFRASTRUCTURE" | "WORKER" | "INTERNAL";

export interface JobProgress {
  current: number;
  total: number;
  label: string;
}

export interface JobAttempt {
  id: string;
  job_id: string;
  attempt_number: number;
  status: JobStatus;
  worker_id: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_code: string | null;
  error_message_safe: string | null;
  error_category: JobErrorCategory | null;
}

export interface JobFailure {
  code: string | null;
  message: string | null;
  category: JobErrorCategory | null;
  retryable: boolean;
}

export interface JobSummary {
  id: string;
  job_type: JobType;
  status: JobStatus;
  workflow_run_id: string;
  workflow_id: string | null;
  workflow_name: string | null;
  dataset_id: string | null;
  dataset_name: string | null;
  input_version_id: string | null;
  input_version_number: number | null;
  output_version_id: string | null;
  output_version_number: number | null;
  queue_name: string;
  attempt_count: number;
  max_attempts: number;
  progress: JobProgress;
  current_step_position: number | null;
  current_operation_code: string | null;
  current_activity: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  heartbeat_at: string | null;
  queue_ms: number | null;
  execution_ms: number | null;
  total_ms: number | null;
  error_code: string | null;
  error_message_safe: string | null;
  error_category: JobErrorCategory | null;
  retryable: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobDetail extends JobSummary {
  request_id: string | null;
  cancel_requested_at: string | null;
  cancelled_at: string | null;
  attempts: JobAttempt[];
  step_runs: import("@/types/workflows").WorkflowStepRun[];
  workflow_revision: number | null;
  workflow_run_status: string | null;
  quality_before: number | null;
  quality_after: number | null;
  rows_before: number | null;
  rows_after: number | null;
}

export interface JobListResponse {
  items: JobSummary[];
  page: number;
  page_size: number;
  total: number;
}

export interface JobFilters {
  status?: JobStatus;
  job_type?: JobType;
  workflow_id?: string;
  dataset_id?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface QueueHealth {
  status: "ready" | "not_configured" | "unavailable";
  backend: string;
  queued_count: number | null;
  name: string;
}

export interface WorkerHealth {
  status: "available" | "unavailable";
  available_count: number;
  last_seen_at: string | null;
}

export interface OperationsHealth {
  queue: QueueHealth;
  worker: WorkerHealth;
  jobs: {
    queued: number;
    running: number;
    failed: number;
    succeeded: number;
  };
}

export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = [
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
];

export function isActiveJobStatus(status: JobStatus): boolean {
  return status === "QUEUED" || status === "RUNNING" || status === "CANCEL_REQUESTED";
}
