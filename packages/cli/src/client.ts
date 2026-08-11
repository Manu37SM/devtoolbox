import type { PublicHashResult, PublicJsonValidateResult } from "@devtoolbox/shared";

export class CliError extends Error {}

const DEFAULT_BASE_URL = "https://api.devtoolbox.dev/v1";

/** Thin fetch wrapper over the Public API (API.md §12). Reads the API key
 * from `DEVTOOLBOX_API_KEY` (never a CLI flag — flags end up in shell
 * history / process lists) and the base URL from `DEVTOOLBOX_API_URL`
 * (override for local/staging backends), matching how every other server
 * call in this codebase resolves its base URL from an env var
 * (frontend/src/lib/api-client.ts's NEXT_PUBLIC_API_BASE_URL). */
export class DevToolboxClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const apiKey = env.DEVTOOLBOX_API_KEY;
    if (!apiKey) {
      throw new CliError(
        "DEVTOOLBOX_API_KEY isn't set. Create a key at devtoolbox.dev/account (PRO/TEAM plan required) and export it.",
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (env.DEVTOOLBOX_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  async hash(input: string, algorithm: string): Promise<PublicHashResult> {
    return this.post<PublicHashResult>("/public/hash", { input, algorithm });
  }

  async jsonValidate(input: string): Promise<PublicJsonValidateResult> {
    return this.post<PublicJsonValidateResult>("/public/json-validate", { input });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(body),
      });
    } catch {
      throw new CliError(`Could not reach ${this.baseUrl}. Check your network or DEVTOOLBOX_API_URL.`);
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
