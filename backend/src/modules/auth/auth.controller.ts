import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import {
  LoginSchema,
  PasswordResetConfirmSchema,
  PasswordResetRequestSchema,
  RegisterSchema,
  VerifyEmailSchema,
} from "@devtoolbox/shared";
import { AuthService, type IssuedRefreshToken } from "./auth.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "./decorators/current-user.decorator";
import { REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_PATH } from "./auth.constants";
import { CaptchaService } from "../../common/captcha/captcha.service";
import { generateCsrfToken } from "../../common/csrf/csrf";

// 10/min/IP per API.md §12 "Auth endpoints" row.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly captcha: CaptchaService,
  ) {}

  @Throttle(AUTH_THROTTLE)
  @Post("register")
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { captchaToken, ...rest } = dto as Parameters<AuthService["register"]>[0] & { captchaToken?: string };
    await this.captcha.verify(captchaToken, req.ip);
    const { tokens, refreshToken } = await this.authService.register(rest, {
      userAgent: req.get("user-agent"),
      ip: req.ip,
    });
    this.setRefreshCookie(res, refreshToken);
    return tokens;
  }

  @Throttle(AUTH_THROTTLE)
  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { captchaToken, ...rest } = dto as Parameters<AuthService["login"]>[0] & { captchaToken?: string };
    await this.captcha.verify(captchaToken, req.ip);
    const { tokens, refreshToken } = await this.authService.login(rest, {
      userAgent: req.get("user-agent"),
      ip: req.ip,
    });
    this.setRefreshCookie(res, refreshToken);
    return tokens;
  }

  @Throttle(AUTH_THROTTLE)
  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    if (!raw) throw new UnauthorizedException("No refresh token provided.");

    const { tokens, refreshToken } = await this.authService.refresh(raw, {
      userAgent: req.get("user-agent"),
      ip: req.ip,
    });
    this.setRefreshCookie(res, refreshToken);
    return tokens;
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    await this.authService.logout(raw);
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: REFRESH_TOKEN_COOKIE_PATH });
  }

  @Post("verify-email")
  @HttpCode(200)
  async verifyEmail(@Body(new ZodValidationPipe(VerifyEmailSchema)) dto: unknown) {
    await this.authService.verifyEmail((dto as { token: string }).token);
    return { ok: true };
  }

  @Throttle(AUTH_THROTTLE)
  @Post("password-reset/request")
  @HttpCode(200)
  async requestPasswordReset(
    @Body(new ZodValidationPipe(PasswordResetRequestSchema)) dto: unknown,
    @Req() req: Request,
  ) {
    const { email, captchaToken } = dto as { email: string; captchaToken?: string };
    await this.captcha.verify(captchaToken, req.ip);
    await this.authService.requestPasswordReset(email, { userAgent: req.get("user-agent"), ip: req.ip });
    // Always the same response — no account-enumeration signal.
    return { ok: true };
  }

  @Throttle(AUTH_THROTTLE)
  @Post("password-reset/confirm")
  @HttpCode(200)
  async confirmPasswordReset(
    @Body(new ZodValidationPipe(PasswordResetConfirmSchema)) dto: unknown,
    @Req() req: Request,
  ) {
    const { token, password } = dto as { token: string; password: string };
    await this.authService.confirmPasswordReset(token, password, { userAgent: req.get("user-agent"), ip: req.ip });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId);
  }

  // Issues the CSRF token + cookie pair a client needs before it can call
  // POST /auth/refresh or /auth/logout — see csrf.ts. GET is exempt from
  // CSRF protection itself (mutates nothing), so this can't be used to
  // forge anything on its own.
  @Get("csrf-token")
  @HttpCode(200)
  csrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return { csrfToken: generateCsrfToken(req, res) };
  }

  private setRefreshCookie(res: Response, token: IssuedRefreshToken): void {
    const isProduction = this.config.get<string>("NODE_ENV") === "production";
    // sameSite: "none" (production only) — frontend (Vercel) and backend
    // (Render) are different registrable domains, so every request between
    // them is cross-site as far as cookies are concerned. "strict" (or even
    // "lax") silently drops this cookie on every cross-site request, which
    // doesn't break the *first* login (the access token lives in memory,
    // not the cookie) but breaks every subsequent session-restore: a page
    // reload, or the full-page redirect round trip for OAuth
    // login/account-linking (see frontend/src/app/auth/callback/[provider]/
    // page.tsx's "waiting-for-session" branch, which surfaced this as
    // "Your session expired before the connection could finish"). "none"
    // requires `secure: true` (browsers reject `SameSite=None` without
    // Secure) — true here since this only applies when isProduction, which
    // is also when `secure` below is true. Local dev keeps "lax": frontend
    // and backend are both on localhost (same site, different ports), so
    // "lax" already works there and doesn't require HTTPS.
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, token.raw, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: REFRESH_TOKEN_COOKIE_PATH,
      expires: token.expiresAt,
    });
  }
}
