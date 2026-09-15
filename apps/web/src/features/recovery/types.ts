export type RecoverySeverity = "info" | "warning" | "error";

export type DataSafety =
  | "unchanged"
  | "not-added"
  | "not-created"
  | "partial-analysis"
  | "partial-save"
  | "unknown";

export type RecoveryOperation =
  | "upload"
  | "analyze"
  | "preview"
  | "cleanup"
  | "save-cleanup"
  | "workflow-run"
  | "load"
  | "delete"
  | "sample"
  | "generic";

export interface RecoveryContext {
  operation: RecoveryOperation;
  action: string;
  resourceId?: string;
  maxUploadSizeMb?: number;
  resource?: "dataset" | "cleanup" | "activity" | "page";
}

export interface RecoveryExperience {
  title: string;
  explanation: string;
  consequence: string;
  severity: RecoverySeverity;
  retrySafe: boolean;
  learnHref?: string;
  learnLabel?: string;
  code?: string;
  requestId?: string;
  status?: number;
  message?: string;
  action: string;
  resourceId?: string;
  dataSafety: DataSafety;
}

export interface ErrorMapEntry {
  title: string;
  explanation: string;
  consequence?: string;
  severity?: RecoverySeverity;
  retrySafe?: boolean;
  learnHref?: string;
  learnLabel?: string;
  dataSafety?: DataSafety;
}
