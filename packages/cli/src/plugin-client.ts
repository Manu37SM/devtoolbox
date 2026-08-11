import { CliError } from "./client";

const DEFAULT_APP_API_URL = "https://devtoolbox.dev/api";

/**
 * Thin fetch wrapper over the *session-authed* plugins API (API.md §18) —
 * deliberately a separate client from `DevToolboxClient`, which only talks
 * to the API-key-authed Public API (§13) and requires a PRO/TEAM plan.
 * Plugin publishing is open to any signed-in user regardless of plan
 * (consistent with "never paywall" — ARCHITECTURE.md §14), so it can't
 * reuse `ApiKeyAuthGuard`'s PRO/TEAM gate; it authenticates with a session
 * access token instead.
 *
 * Known v1 rough edge, disclosed rather than hidden: session access tokens
 * are short-lived (`ACCESS_TOKEN_TTL` in the auth module), so
 * `DEVTOOLBOX_ACCESS_TOKEN` needs to be refreshed by hand — copy a fresh
 * one from the browser's session after signing in, or from a future
 * `devtoolbox login` command this pass doesn't add. A longer-lived,
 * scoped "publish token" type would be the real fix; tracked as a
 * follow-up rather than built speculatively here (AUDIT_REPORT.md §18.2).
 */
export class PluginPublishClient {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const accessToken = env.DEVTOOLBOX_ACCESS_TOKEN;
    if (!accessToken) {
      throw new CliError(
        "DEVTOOLBOX_ACCESS_TOKEN isn't set. Sign in at devtoolbox.dev, copy your session access token, and export it.",
      );
    }
    this.accessToken = accessToken;
    this.baseUrl = (env.DEVTOOLBOX_APP_API_URL ?? DEFAULT_APP_API_URL).replace(/\/$/, "");
  }

  async createPlugin(input: { slug: string; name: string; description: string }): Promise<{ id: string; slug: string }> {
    return this.request<{ id: string; slug: string }>("POST", "/plugins", input);
  }

  async submitVersion(
    pluginId: string,
    input: { manifest: Record<string, unknown>; wasmBase64: string },
  ): Promise<{ version: string }> {
    return this.request<{ version: string }>("POST", `/plugins/${pluginId}/versions`, input);
  }

  async findPluginBySlug(slug: string): Promise<{ id: string; slug: string } | null> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/plugins/${slug}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
    } catch {
      throw new CliError(`Could not reach ${this.baseUrl}. Check your network or DEVTOOLBOX_APP_API_URL.`);
    }
    if (response.status === 404) return null;
    if (!response.ok) throw new CliError(`Request failed (${response.status})`);
    return (await response.json()) as { id: string; slug: string };
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new CliError(`Could not reach ${this.baseUrl}. Check your network or DEVTOOLBOX_APP_API_URL.`);
    }

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const data = (await response.json()) as { error?: { message?: string } };
        if (data?.error?.message) message = data.error.message;
      } catch {
        // non-JSON error body — keep the generic message
      }
      throw new CliError(message);
    }

    return (await response.json()) as T;
  }
}
