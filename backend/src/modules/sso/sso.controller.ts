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

// 10/min/IP, same budget as the existing OAuth/auth login endpoints
// (API.md §12) — this is an unauthenticated, IdP-facing surface.
const SSO_LOGIN_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

/**
 * Org-level SSO (API.md §17.5, AUDIT_REPORT.md §23) — the last item deferred
 * from the original team workspaces MVP pass. Split across two route
 * groups: OWNER/ADMIN configuration nested under `/organizations/:id/sso`
 * (reuses org membership as the authorization boundary, same as every other
 * org-scoped route), and public IdP-facing login endpoints under `/sso/*`
 * (discovery, OIDC authorize+callback, SAML authorize+callback) which by
 * definition can't require a DevToolbox session — that's the thing being
 * established.
 */
@Controller()
export class SsoController {
  constructor(
    private readonly ssoService: SsoService,
    private readonly config: ConfigService,
  ) {}

  // ── Admin configuration ────────────────────────────────────────────────

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

  // ── Public discovery ───────────────────────────────────────────────────

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get("sso/discover")
  async discover(@Query("domain") domain: string) {
    return this.ssoService.discover(domain ?? "");
  }

  // ── OIDC login flow ────────────────────────────────────────────────────

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

  // ── SAML login flow ────────────────────────────────────────────────────
  // SP-initiated: /sso/saml/authorize returns the IdP redirect URL for the
  // frontend to navigate to. The IdP then POSTs the assertion directly back
  // to /sso/saml/callback (the ACS URL) as a browser form submission, not a
  // frontend fetch — SAML doesn't support OIDC/OAuth's "frontend obtains a
  // code and POSTs JSON" shape, since the assertion is only ever delivered
  // via that form POST. The callback therefore sets the session cookie
  // itself and redirects to the frontend, which picks up the session via
  // its existing silent-refresh-on-load flow rather than receiving tokens
  // directly in this response.

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
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, token.raw, {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "strict",
      path: REFRESH_TOKEN_COOKIE_PATH,
      expires: token.expiresAt,
    });
  }
}
