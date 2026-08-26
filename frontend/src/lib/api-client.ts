import type { ApiErrorBody, AuthTokenResponse } from "@devtoolbox/shared";
import { useAuthStore } from "@/store/auth-store";

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

  authenticated?: boolean;
}

async function rawRequest<T>(path: string, init: RequestInit): Promise<T> {

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,

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

    }
    throw new ApiClientError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

let refreshInFlight: Promise<void> | null = null;

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

export function apiPost<T>(path: string, body: unknown, opts: RequestOptions = {}): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body), ...opts });
}

export function apiPatch<T>(path: string, body: unknown, opts: { authenticated?: boolean } = {}): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body), ...opts });
}

export function apiDelete<T>(path: string, opts: { authenticated?: boolean } = {}): Promise<T> {
  return request<T>(path, { method: "DELETE", ...opts });
}
