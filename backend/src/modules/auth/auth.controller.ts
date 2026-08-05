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

// 10/min/IP per API.md §12 "Auth endpoints" row.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Throttle(AUTH_THROTTLE)
  @Post("register")
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, refreshToken } = await this.authService.register(
      dto as Parameters<AuthService["register"]>[0],
      { userAgent: req.get("user-agent"), ip: req.ip },
    );
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
    const { tokens, refreshToken } = await this.authService.login(
      dto as Parameters<AuthService["login"]>[0],
      { userAgent: req.get("user-agent"), ip: req.ip },
    );
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
  async requestPasswordReset(@Body(new ZodValidationPipe(PasswordResetRequestSchema)) dto: unknown) {
    await this.authService.requestPasswordReset((dto as { email: string }).email);
    // Always the same response — no account-enumeration signal.
    return { ok: true };
  }

  @Throttle(AUTH_THROTTLE)
  @Post("password-reset/confirm")
  @HttpCode(200)
  async confirmPasswordReset(@Body(new ZodValidationPipe(PasswordResetConfirmSchema)) dto: unknown) {
    const { token, password } = dto as { token: string; password: string };
    await this.authService.confirmPasswordReset(token, password);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId);
  }

  private setRefreshCookie(res: Response, token: IssuedRefreshToken): void {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, token.raw, {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "strict",
      path: REFRESH_TOKEN_COOKIE_PATH,
      expires: token.expiresAt,
    });
  }
}
