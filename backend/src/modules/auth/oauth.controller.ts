import { BadRequestException, Body, Controller, HttpCode, Param, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { OAuthCallbackSchema, OAuthProviders, type OAuthProvider } from "@devtoolbox/shared";
import { OAuthService } from "./oauth.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_PATH } from "./auth.constants";
import type { IssuedRefreshToken } from "./auth.service";

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
