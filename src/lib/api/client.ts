import type { ApiErrorPayload } from "@/lib/api/types";

export class ApiError extends Error {
  status: number;
  code: string | null;
  details?: unknown;

  constructor(status: number, payload: ApiErrorPayload | null) {
    super(payload?.error.message || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = payload?.error.code || null;
    this.details = payload?.error.details;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | object | null;
};

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !(value instanceof FormData);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const method = String(options.method || "GET").toUpperCase();
  let body: BodyInit | undefined;

  if (UNSAFE_METHODS.has(method) && !headers.has("X-Valtherea-CSRF")) {
    headers.set("X-Valtherea-CSRF", "1");
  }

  if (typeof options.body !== "undefined" && options.body !== null) {
    if (isPlainObject(options.body)) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    } else {
      body = options.body as BodyInit;
    }
  }

  const response = await fetch(path, {
    ...options,
    body,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T | ApiErrorPayload) : null;

  if (!response.ok) {
    throw new ApiError(response.status, (payload as ApiErrorPayload | null) || null);
  }

  return payload as T;
}
