import { CliError } from "./client";

const DEFAULT_APP_API_URL = "https://devtoolbox.dev/api";

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
      const data = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (data?.error?.message) message = data.error.message;
      throw new CliError(message);
    }

    return (await response.json()) as T;
  }
}
