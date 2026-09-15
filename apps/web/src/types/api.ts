export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: unknown;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface HealthData {
  status: "healthy";
  service: string;
  version: string;
}

export type DependencyStatus = "ready" | "not_configured" | "unavailable";

export interface CheckResult {
  status: DependencyStatus;
  message: string;
}

export interface ReadinessData {
  status: "ready" | "not_ready";
  checks: {
    database?: CheckResult;
    [key: string]: CheckResult | undefined;
  };
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;
  readonly requestId: string | undefined;

  constructor(options: {
    message: string;
    code: string;
    status: number;
    details?: unknown;
    requestId?: string;
  }) {
    super(options.message);
    this.name = "ApiClientError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}
