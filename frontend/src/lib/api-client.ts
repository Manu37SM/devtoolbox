import type { ApiErrorBody, AuthTokenResponse } from "@devtoolbox/shared";
import { useAuthStore } from "@/store/auth-store";

/** Thin fetch wrapper for the handful of things that must call the
 * backend: Module 8 tools (ARCHITECTURE.md §8.4 tier 2 — server-assisted,
 * ephemeral; API.md §10) and now Auth/Sync/Snippets/Pipelines/Share
 * (Phase 3, tier 3 — server-persisted, opt-in). Every other tool in this
 * app is client-only; this helper exists specifically for the exceptions,
 * not as a general-purpose data layer. Throws `ApiClientError` with the
 * server's message on any non-2xx response, parsed from the standard
 * error envelope (API.md §1) when present. */
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
      "This feature needs a backend connection (NEXT_PUBLIC_API_BASE_URL isn't set) — see .env.example.",
      0,
    );
  }
  return base.replace(/\/$/, "");
}

interface RequestOptions extends RequestInit {
  /** Attach the current access token and, on a 401, try one silent
   * `/auth/refresh` + retry before giving up. Off by default so the
   * existing anonymous Module 8 tool calls are unaffected. */
  authenticated?: boolean;
}

async function rawRequest<T>(path: string, init: RequestInit): Promise<T> {
  // `init.headers` may already be a `Headers` instance (built in
  // `request()` below to attach the Authorization header) — object-spread
  // on a `Headers` instance silently copies nothing, since it doesn't
  // expose its entries as own enumerable properties. Always go through the
  // `Headers` API so both plain-object and `Headers`-instance callers merge
  // correctly.
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      // Refresh token travels as an httpOnly cookie (ARCHITECTURE.md §9) —
      // every request includes credentials so the browser sends/receives
      // it; this is a no-op for anonymous Module 8 calls.
      credentials: "include",
      headers,
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

let refreshInFlight: Promise<void> | null = null;

/** Calls `/auth/refresh` at most once concurrently (later callers await
 * the same promise) and updates the auth store on success, clears it on
 * failure. */
async function refreshSession(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = rawRequest<AuthTokenResponse>("/auth/refresh", { method: "POST" })
      .then((res) => {
        useAuthStore.getState().setSession(res.accessToken, res.user);
      })
      .catch((err) => {
        useAuthStore.getState().clearSession();
        throw err;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request<T>(path: string, { authenticated, ...init }: RequestOptions): Promise<T> {
  const headers = new Headers(init.headers);
  if (authenticated) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    return await rawRequest<T>(path, { ...init, headers });
  } catch (err) {
    if (authenticated && err instanceof ApiClientError && err.status === 401) {
      await refreshSession();
      const token = useAuthStore.getState().accessToken;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return rawRequest<T>(path, { ...init, headers });
    }
    throw err;
  }
}

export function apiGet<T>(path: string, opts: { authenticated?: boolean } = {}): Promise<T> {
  return request<T>(path, { method: "GET", ...opts });
}

export function apiPost<T>(path: string, body: unknown, opts: { authenticated?: boolean } = {}): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body), ...opts });
}

export function apiPatch<T>(path: string, body: unknown, opts: { authenticated?: boolean } = {}): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body), ...opts });
}

export function apiDelete<T>(path: string, opts: { authenticated?: boolean } = {}): Promise<T> {
  return request<T>(path, { method: "DELETE", ...opts });
}
