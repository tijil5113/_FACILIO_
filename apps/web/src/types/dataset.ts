export type DatasetStatus = "pending" | "processing" | "ready" | "failed";

export type DatasetFileType = "csv" | "xlsx" | "json";

export type ColumnDtype =
  "text" | "integer" | "decimal" | "boolean" | "datetime" | "unknown";

export interface DatasetColumn {
  name: string;
  index: number;
  dtype: ColumnDtype;
}

export interface DatasetSummary {
  id: string;
  name: string;
  original_filename: string;
  file_type: DatasetFileType;
  mime_type: string | null;
  file_size: number;
  status: DatasetStatus;
  row_count: number | null;
  column_count: number | null;
  selected_sheet: string | null;
  encoding: string | null;
  delimiter: string | null;
  created_at: string;
  updated_at: string;
  profile_status: "NOT_PROFILED" | "PROFILING" | "READY" | "FAILED";
  quality_score: number | null;
  quality_grade: string | null;
  profiled_at: string | null;
  current_version_id: string | null;
  current_version_number: number | null;
  version_count: number;
  is_sample?: boolean;
  sample_key?: string | null;
  issue_count?: number | null;
}

export interface DatasetDetail extends DatasetSummary {
  columns: DatasetColumn[];
  error_code: string | null;
  error_message: string | null;
}

export interface DatasetListResponse {
  items: DatasetSummary[];
  page: number;
  page_size: number;
  total: number;
  max_upload_size_mb: number;
  supported_file_types: DatasetFileType[];
}

export interface DatasetPreview {
  dataset_id: string;
  version_id: string | null;
  version_number: number | null;
  columns: DatasetColumn[];
  rows: unknown[][];
  row_count: number;
  column_count: number;
  preview_row_count: number;
  truncated_rows: boolean;
  truncated_columns: boolean;
}

export interface SheetInfo {
  name: string;
  empty: boolean;
  hidden: boolean;
}

export interface SheetSelectionDetails {
  staging_id: string;
  original_filename: string;
  file_type: "xlsx";
  file_size: number;
  sheets: SheetInfo[];
}

export type UploadStage =
  "idle" | "preparing" | "uploading" | "processing" | "success" | "failed";
