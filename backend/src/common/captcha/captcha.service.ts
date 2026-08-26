import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(private readonly config: ConfigService) {}

  async verify(token: string | undefined, ip: string | undefined): Promise<void> {
    const secret = this.config.get<string>("TURNSTILE_SECRET_KEY");
    if (!secret) return;

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

      this.logger.error("Turnstile verification request failed", err instanceof Error ? err.stack : String(err));
      throw new UnauthorizedException("Captcha verification is temporarily unavailable. Please try again.");
    }
  }
}
