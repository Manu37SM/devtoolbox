import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { OAuthCallbackSchema, OAuthProviders, type OAuthProvider } from "@devtoolbox/shared";
import { OAuthService } from "./oauth.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_PATH } from "./auth.constants";
import type { IssuedRefreshToken } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "./decorators/current-user.decorator";

@Controller("auth/oauth")
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly config: ConfigService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(":provider/callback")
  @HttpCode(200)
  async callback(
    @Param("provider") provider: string,
    @Body(new ZodValidationPipe(OAuthCallbackSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!OAuthProviders.includes(provider as OAuthProvider)) {
      throw new BadRequestException(`Unsupported OAuth provider "${provider}".`);
    }

    const { code, redirectUri } = dto as { code: string; redirectUri: string };
    const { tokens, refreshToken } = await this.oauthService.handleCallback(
      provider as OAuthProvider,
      code,
      redirectUri,
      { userAgent: req.get("user-agent"), ip: req.ip },
    );

    this.setRefreshCookie(res, refreshToken);
    return tokens;
  }

  // ── Account-linking (signed-in user connecting/disconnecting a provider,
  // distinct from the sign-in/signup flow above) — reached from /account,
  // not /login or /register. ────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get("linked")
  async listLinked(@CurrentUser() user: AuthenticatedUser) {
    return { accounts: await this.oauthService.listLinkedAccounts(user.userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(":provider/link")
  @HttpCode(200)
  async link(
    @CurrentUser() user: AuthenticatedUser,
    @Param("provider") provider: string,
    @Body(new ZodValidationPipe(OAuthCallbackSchema)) dto: unknown,
  ) {
    if (!OAuthProviders.includes(provider as OAuthProvider)) {
      throw new BadRequestException(`Unsupported OAuth provider "${provider}".`);
    }
    const { code, redirectUri } = dto as { code: string; redirectUri: string };
    await this.oauthService.linkAccount(user.userId, provider as OAuthProvider, code, redirectUri);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":provider")
  @HttpCode(204)
  async unlink(@CurrentUser() user: AuthenticatedUser, @Param("provider") provider: string) {
    if (!OAuthProviders.includes(provider as OAuthProvider)) {
      throw new BadRequestException(`Unsupported OAuth provider "${provider}".`);
    }
    await this.oauthService.unlinkAccount(user.userId, provider as OAuthProvider);
  }

  private setRefreshCookie(res: Response, token: IssuedRefreshToken): void {
    // sameSite: "none" in production — see auth.controller.ts's
    // setRefreshCookie for why (frontend/backend are different registrable
    // domains, so this cookie is cross-site and "strict"/"lax" silently
    // drop it).
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
