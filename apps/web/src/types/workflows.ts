export type WorkflowStatus = "DRAFT" | "READY" | "INVALID" | "ARCHIVED";

export type WorkflowRunStatus =
  "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export type WorkflowStepRunStatus =
  "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED" | "CANCELLED";

export type CompatibilityStatus = "COMPATIBLE" | "INCOMPATIBLE";

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  position: number;
  operation_code: string;
  parameters: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  revision: number;
  step_count: number;
  enabled_step_count: number;
  last_run_at: string | null;
  last_run_status: WorkflowRunStatus | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDetail extends WorkflowSummary {
  steps: WorkflowStep[];
}

export interface WorkflowListResponse {
  items: WorkflowSummary[];
  page: number;
  page_size: number;
  total: number;
}

export interface WorkflowRevision {
  revision: number;
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  step_id: string | null;
  position: number | null;
  field: string | null;
  column: string | null;
  details: Record<string, unknown>;
}

export interface SchemaColumn {
  name: string;
  dtype: string;
}

export interface ContractColumn {
  name: string;
  dtype: string;
  numeric_compatible: boolean;
}

export interface WorkflowCompatibility {
  status: CompatibilityStatus;
  compatible: boolean;
  reasons: ValidationIssue[];
}

export interface StepValidation {
  step_id: string;
  position: number;
  operation_code: string;
  enabled: boolean;
  valid: boolean;
  schema_before: SchemaColumn[];
  schema_after: SchemaColumn[];
  issues: ValidationIssue[];
}

export interface WorkflowValidation {
  valid: boolean;
  empty: boolean;
  issues: ValidationIssue[];
  steps: StepValidation[];
  contract: ContractColumn[];
  compatibility: WorkflowCompatibility | null;
  projected_schema: SchemaColumn[];
}

export interface WorkflowPreviewStep {
  step_id: string;
  position: number;
  operation_code: string;
  parameters: Record<string, unknown>;
  status: WorkflowStepRunStatus;
  impact: {
    rows_before: number;
    rows_after: number;
    columns_before: number;
    columns_after: number;
    changed_cell_count: number;
    removed_row_count: number;
    removed_column_count: number;
    affected_row_count: number;
    no_op: boolean;
  } | null;
  examples: {
    kind: "cell" | "row_removed" | "column_removed";
    row_index: number | null;
    column: string | null;
    before: unknown;
    after: unknown;
    reason: string | null;
  }[];
  warnings: string[];
  summary: string;
  duration_ms: number;
  error_code: string | null;
  error_message: string | null;
}

export interface WorkflowPreview {
  validation: WorkflowValidation;
  no_op: boolean;
  rows_before: number;
  rows_after: number;
  columns_before: number;
  columns_after: number;
  steps: WorkflowPreviewStep[];
  projected_quality: {
    before: number | null;
    after: number | null;
    delta: number | null;
    dimensions: {
      key: string;
      label: string;
      before: number | null;
      after: number | null;
      delta: number | null;
    }[];
  } | null;
  duration_ms: number;
}

export interface WorkflowSnapshot {
  workflow_id: string;
  name: string;
  revision: number;
  steps: Record<string, unknown>[];
}

export interface WorkflowStepRun {
  id: string;
  workflow_run_id: string;
  workflow_step_id: string | null;
  position: number;
  operation_code: string;
  status: WorkflowStepRunStatus;
  duration_ms: number | null;
  rows_before: number | null;
  rows_after: number | null;
  columns_before: number | null;
  columns_after: number | null;
  changed_cells: number | null;
  removed_rows: number | null;
  removed_columns: number | null;
  warning_summary: string | null;
  error_code: string | null;
  error_message_safe: string | null;
  step_snapshot: Record<string, unknown>;
}

export interface RunQualityDelta {
  before: number | null;
  after: number | null;
  delta: number | null;
}

export interface WorkflowRunSummary {
  id: string;
  workflow_id: string | null;
  workflow_name: string;
  workflow_revision: number;
  input_dataset_id: string | null;
  input_dataset_name: string | null;
  input_version_id: string | null;
  output_version_id: string | null;
  input_version_number: number | null;
  output_version_number: number | null;
  status: WorkflowRunStatus;
  step_count: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_code: string | null;
  error_message_safe: string | null;
  quality_before: number | null;
  quality_after: number | null;
}

export interface WorkflowRun extends WorkflowRunSummary {
  workflow_snapshot: WorkflowSnapshot | Record<string, unknown>;
  step_runs: WorkflowStepRun[];
  quality_delta: RunQualityDelta | null;
}

export interface WorkflowRunListResponse {
  items: WorkflowRunSummary[];
  page: number;
  page_size: number;
  total: number;
}

export interface RunListFilters {
  workflow_id?: string;
  dataset_id?: string;
  status?: WorkflowRunStatus;
  page?: number;
  page_size?: number;
}

export interface WorkflowInput {
  dataset_id: string;
  version_id: string;
}
