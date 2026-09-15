import { getApiBaseUrl } from "@/lib/config";
import { ApiClientError, type ApiResponse } from "@/types/api";

const DEFAULT_TIMEOUT_MS = 8_000;
const UPLOAD_TIMEOUT_MS = 120_000;
const REQUEST_ID_HEADER = "X-Request-ID";

interface RequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiFailure(value: unknown): value is {
  success: false;
  error: { code: string; message: string; details: unknown };
} {
  if (!isRecord(value) || value.success !== false || !isRecord(value.error)) {
    return false;
  }
  return typeof value.error.code === "string" && typeof value.error.message === "string";
}

function isApiSuccess(value: unknown): value is { success: true; data: unknown } {
  return isRecord(value) && value.success === true && "data" in value;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  if (options.signal) {
    options.signal.addEventListener("abort", () => {
      controller.abort();
    });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body,
      signal: controller.signal,
    });
  } catch (error) {
    window.clearTimeout(timeout);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError({
        message: "The request timed out.",
        code: "TIMEOUT",
        status: 0,
      });
    }
    throw new ApiClientError({
      message: "The API could not be reached.",
      code: "NETWORK_ERROR",
      status: 0,
    });
  }
  window.clearTimeout(timeout);

  const requestId = response.headers.get(REQUEST_ID_HEADER) ?? undefined;
  const payload: unknown = await response.json().catch(() => null);

  if (isApiFailure(payload)) {
    throw new ApiClientError({
      message: payload.error.message,
      code: payload.error.code,
      status: response.status,
      details: payload.error.details,
      requestId,
    });
  }

  if (!response.ok) {
    throw new ApiClientError({
      message: "The API returned an unexpected response.",
      code: "UNEXPECTED_RESPONSE",
      status: response.status,
      requestId,
    });
  }

  if (!isApiSuccess(payload)) {
    throw new ApiClientError({
      message: "The API response did not match the expected contract.",
      code: "INVALID_CONTRACT",
      status: response.status,
      requestId,
    });
  }

  return payload.data as T;
}

export function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>(path, options);
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}

export function apiPost<T>(path: string, body?: unknown, timeoutMs = 8_000): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body),
    timeoutMs,
  });
}

export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: form,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
}

export type { ApiResponse };
