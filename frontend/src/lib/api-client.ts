import type { ApiErrorBody } from "@devtoolbox/shared";

/** Thin fetch wrapper for the handful of Module 8 tools that must call the
 * backend (ARCHITECTURE.md §8.4 tier 2 — server-assisted, ephemeral; see
 * API.md §10). Every other tool in this app is client-only; this helper
 * exists specifically for the exception, not as a general-purpose data
 * layer. Throws `ApiClientError` with the server's message on any non-2xx
 * response, parsed from the standard error envelope (API.md §1) when
 * present. */
export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

function apiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new ApiClientError(
      "This tool needs a backend connection (NEXT_PUBLIC_API_BASE_URL isn't set) — see .env.example.",
      0,
    );
  }
  return base.replace(/\/$/, "");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiClientError("Could not reach the backend. Is it running?", 0);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body?.error?.message) message = body.error.message;
      code = body?.error?.code;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiClientError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}
