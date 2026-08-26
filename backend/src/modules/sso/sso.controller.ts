import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { OidcCallbackSchema, SetSsoConnectionEnabledSchema, UpsertSsoConnectionSchema } from "@devtoolbox/shared";
import { SsoService } from "./sso.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_PATH } from "../auth/auth.constants";
import type { IssuedRefreshToken } from "../auth/auth.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

const SSO_ADMIN_THROTTLE = {
  route: "sso-admin",
  anonymous: { limit: 1, ttlSeconds: 3_600 },
  free: { limit: 60, ttlSeconds: 3_600 },
  pro: { limit: 60, ttlSeconds: 3_600 },
} as const;

const SSO_LOGIN_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller()
export class SsoController {
  constructor(
    private readonly ssoService: SsoService,
    private readonly config: ConfigService,
  ) {}

  @PlanThrottle(SSO_ADMIN_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Get("organizations/:id/sso")
  async getConnection(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.ssoService.getConnection(user.userId, id);
  }

  @PlanThrottle(SSO_ADMIN_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post("organizations/:id/sso")
  @HttpCode(200)
  async upsertConnection(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpsertSsoConnectionSchema)) dto: unknown,
  ) {
    return this.ssoService.upsertConnection(user.userId, id, dto as Parameters<SsoService["upsertConnection"]>[2]);
  }

  @PlanThrottle(SSO_ADMIN_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post("organizations/:id/sso/enabled")
  async setEnabled(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(SetSsoConnectionEnabledSchema)) dto: unknown,
  ) {
    return this.ssoService.setEnabled(user.userId, id, (dto as { enabled: boolean }).enabled);
  }

  @PlanThrottle(SSO_ADMIN_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Delete("organizations/:id/sso")
  @HttpCode(204)
  async deleteConnection(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.ssoService.deleteConnection(user.userId, id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get("sso/discover")
  async discover(@Query("domain") domain: string) {
    return this.ssoService.discover(domain ?? "");
  }

  @Throttle(SSO_LOGIN_THROTTLE)
  @Get("sso/oidc/authorize")
  async oidcAuthorize(@Query("domain") domain: string, @Query("redirectUri") redirectUri: string) {
    return this.ssoService.buildOidcAuthorizeUrl(domain, redirectUri);
  }

  @Throttle(SSO_LOGIN_THROTTLE)
  @Post("sso/oidc/callback")
  @HttpCode(200)
  async oidcCallback(
    @Body(new ZodValidationPipe(OidcCallbackSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { code, state, redirectUri } = dto as { code: string; state: string; redirectUri: string };
    const { tokens, refreshToken } = await this.ssoService.handleOidcCallback(code, state, redirectUri, {
      userAgent: req.get("user-agent"),
      ip: req.ip,
    });
    this.setRefreshCookie(res, refreshToken);
    return tokens;
  }

  @Throttle(SSO_LOGIN_THROTTLE)
  @Get("sso/saml/authorize")
  async samlAuthorize(@Query("domain") domain: string) {
    const callbackUrl = `${this.config.get<string>("BACKEND_URL") ?? "http://localhost:4000"}/sso/saml/callback`;
    const url = await this.ssoService.buildSamlAuthorizeUrl(domain, callbackUrl);
    return { url };
  }

  @Throttle(SSO_LOGIN_THROTTLE)
  @Post("sso/saml/callback")
  @HttpCode(302)
  async samlCallback(
    @Body() body: { SAMLResponse?: string; RelayState?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const callbackUrl = `${this.config.get<string>("BACKEND_URL") ?? "http://localhost:4000"}/sso/saml/callback`;
    if (!body.SAMLResponse) {
      res.redirect(`${this.frontendUrl()}/login?ssoError=1`);
      return;
    }
    try {
      const { refreshToken } = await this.ssoService.handleSamlCallback(body.SAMLResponse, body.RelayState, callbackUrl, {
        userAgent: req.get("user-agent"),
        ip: req.ip,
      });
      this.setRefreshCookie(res, refreshToken);
      res.redirect(`${this.frontendUrl()}/account?sso=1`);
    } catch {
      res.redirect(`${this.frontendUrl()}/login?ssoError=1`);
    }
  }

  private frontendUrl(): string {
    return this.config.get<string>("FRONTEND_URL") ?? "https://devtoolbox.dev";
  }

  private setRefreshCookie(res: Response, token: IssuedRefreshToken): void {

    const isProduction = this.config.get<string>("NODE_ENV") === "production";
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, token.raw, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: REFRESH_TOKEN_COOKIE_PATH,
      expires: token.expiresAt,
    });
  }
}
