export type VersionKind = "ORIGINAL" | "DERIVED";

export type TransformationCategory = "CLEAN_TEXT" | "MISSING_DATA" | "ROWS" | "COLUMNS";

export interface ParameterSpec {
  name: string;
  type: string;
  required: boolean;
  description: string;
  options: string[] | null;
  default: unknown;
}

export interface TransformationDefinition {
  code: string;
  display_name: string;
  description: string;
  category: TransformationCategory;
  supported_column_types: string[];
  dataset_level: boolean;
  notes: string[];
  parameters: ParameterSpec[];
}

export interface DatasetVersion {
  id: string;
  dataset_id: string;
  version_number: number;
  parent_version_id: string | null;
  kind: VersionKind;
  label: string;
  row_count: number | null;
  column_count: number | null;
  profile_status: "NOT_PROFILED" | "PROFILING" | "READY" | "FAILED";
  profiled_at: string | null;
  created_at: string;
  is_current: boolean;
  operation_code: string | null;
  operation_summary: string | null;
  created_by_workflow_run_id: string | null;
  workflow_name: string | null;
  workflow_revision: number | null;
}

export interface DatasetVersionDetail extends DatasetVersion {
  columns: { name: string; index: number; dtype: string }[];
}

export interface TransformationImpact {
  rows_before: number;
  rows_after: number;
  columns_before: number;
  columns_after: number;
  changed_cell_count: number;
  removed_row_count: number;
  removed_column_count: number;
  affected_row_count: number;
  no_op: boolean;
}

export interface ChangeExample {
  kind: "cell" | "row_removed" | "column_removed";
  row_index: number | null;
  column: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
}

export interface TransformationPreview {
  operation: string;
  parameters: Record<string, unknown>;
  input_version_id: string;
  impact: TransformationImpact;
  examples: ChangeExample[];
  warnings: string[];
  summary: string;
  extra: Record<string, unknown>;
}

export interface QualityDeltaDimension {
  key: string;
  label: string;
  before: number | null;
  after: number | null;
  delta: number | null;
}

export interface QualityDelta {
  before: number | null;
  after: number | null;
  delta: number | null;
  dimensions: QualityDeltaDimension[];
}

export interface TransformationRecord {
  id: string;
  dataset_id: string;
  input_version_id: string;
  output_version_id: string;
  operation_code: string;
  parameters: Record<string, unknown>;
  summary: string;
  impact: TransformationImpact;
  created_at: string;
}

export interface TransformationApplyResult {
  version: DatasetVersionDetail;
  transformation_id: string;
  summary: string;
  impact: TransformationImpact;
  profile_status: DatasetVersion["profile_status"];
  quality_delta: QualityDelta | null;
}

export interface LineageNode {
  version: DatasetVersion;
  transformation: TransformationRecord | null;
}

export interface Lineage {
  items: LineageNode[];
}

export interface VersionComparison {
  parent: DatasetVersion;
  child: DatasetVersion;
  impact: TransformationImpact | null;
  transformation: TransformationRecord | null;
  quality_delta: QualityDelta | null;
}

export interface WorkspaceStats {
  datasets: number;
  derived_versions: number;
  transformations_applied: number;
  datasets_analyzed: number;
  workflow_count: number;
  workflow_run_count: number;
  successful_run_count: number;
  failed_run_count: number;
  queued_job_count: number;
  running_job_count: number;
  failed_job_count: number;
  user_dataset_count?: number;
  sample_dataset_count?: number;
  recent_datasets?: import("@/types/dataset").DatasetSummary[];
}

export interface SuggestedOperation {
  code: string;
  display_name: string;
  reason: string;
  parameters: Record<string, unknown>;
}

export interface TransformationRequest {
  operation: string;
  parameters: Record<string, unknown>;
}
