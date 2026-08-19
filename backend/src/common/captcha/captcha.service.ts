import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Checklist item #12 — bot protection on auth endpoints (register, login,
 * password-reset request), via Cloudflare Turnstile. No new npm dependency:
 * Turnstile's server-side check is a single POST verified with Node's
 * built-in `fetch` (Node 22, per ci.yml's node-version).
 *
 * Frontend still needs to render the Turnstile widget and send its token as
 * `captchaToken` in the request body — see FEATURE.md/API.md follow-up note
 * added alongside this change. Requires TURNSTILE_SECRET_KEY (backend) and
 * a matching NEXT_PUBLIC_TURNSTILE_SITE_KEY (frontend) — both are free,
 * created at https://dash.cloudflare.com/?to=/:account/turnstile.
 *
 * Degrades safely, like every other optional integration in this codebase
 * (see main.ts's Sentry init comment): if TURNSTILE_SECRET_KEY isn't set,
 * verification is skipped entirely rather than failing closed — this keeps
 * local dev and any environment that hasn't provisioned a Turnstile key yet
 * working. Set the env var in production to actually enforce this.
 */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(private readonly config: ConfigService) {}

  async verify(token: string | undefined, ip: string | undefined): Promise<void> {
    const secret = this.config.get<string>("TURNSTILE_SECRET_KEY");
    if (!secret) return; // not configured — see class doc

    if (!token) {
      throw new UnauthorizedException("Captcha verification is required.");
    }

    try {
      const params = new URLSearchParams({ secret, response: token });
      if (ip) params.set("remoteip", ip);

      const res = await fetch(VERIFY_URL, { method: "POST", body: params });
      const body = (await res.json()) as { success: boolean };

      if (!body.success) {
        throw new UnauthorizedException("Captcha verification failed.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      // Network/Turnstile-outage failure — fail closed on auth endpoints
      // rather than silently letting bots through.
      this.logger.error("Turnstile verification request failed", err instanceof Error ? err.stack : String(err));
      throw new UnauthorizedException("Captcha verification is temporarily unavailable. Please try again.");
    }
  }
}
