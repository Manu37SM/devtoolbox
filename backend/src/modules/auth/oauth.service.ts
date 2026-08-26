import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthTokenResponse, LinkedOAuthAccount, OAuthProvider } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";
import { AuthService, type IssuedRefreshToken } from "./auth.service";

interface OAuthProfile {
  providerUserId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  async handleCallback(
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{ tokens: AuthTokenResponse; refreshToken: IssuedRefreshToken }> {
    const profile = await this.exchangeProfile(provider, code, redirectUri);

    const user = await this.findOrCreateUser(provider, profile);
    const refreshToken = await this.authService.createSession(user.id, meta);
    return { tokens: this.authService.buildAuthResponse(user), refreshToken };
  }

  async linkAccount(userId: string, provider: OAuthProvider, code: string, redirectUri: string): Promise<void> {
    const profile = await this.exchangeProfile(provider, code, redirectUri);
    const existingLink = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId: profile.providerUserId } },
    });

    if (existingLink) {
      if (existingLink.userId === userId) return;
      throw new ConflictException(`This ${provider} account is already linked to a different DevToolbox account.`);
    }

    await this.prisma.oAuthAccount.create({ data: { userId, provider, providerUserId: profile.providerUserId } });
  }

  async listLinkedAccounts(userId: string): Promise<LinkedOAuthAccount[]> {
    const rows = await this.prisma.oAuthAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({ provider: row.provider as OAuthProvider, createdAt: row.createdAt.toISOString() }));
  }

  async unlinkAccount(userId: string, provider: OAuthProvider): Promise<void> {
    const [user, links] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.oAuthAccount.findMany({ where: { userId } }),
    ]);
    if (!user) throw new UnauthorizedException("Account no longer available.");

    const hasOtherAuthMethod = Boolean(user.passwordHash) || links.some((l) => l.provider !== provider);
    if (!hasOtherAuthMethod) {
      throw new BadRequestException(
        "Can't disconnect your only sign-in method. Set a password or connect another provider first.",
      );
    }

    await this.prisma.oAuthAccount.deleteMany({ where: { userId, provider } });
  }

  private async exchangeProfile(provider: OAuthProvider, code: string, redirectUri: string): Promise<OAuthProfile> {
    return provider === "github"
      ? this.exchangeGithub(code, redirectUri)
      : this.exchangeGoogle(code, redirectUri);
  }

  private async findOrCreateUser(provider: OAuthProvider, profile: OAuthProfile) {
    const existingLink = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId: profile.providerUserId } },
    });
    if (existingLink) {
      const user = await this.prisma.user.findUnique({ where: { id: existingLink.userId } });
      if (!user || user.deletedAt) throw new UnauthorizedException("Account no longer available.");
      return user;
    }

    if (profile.email) {
      const existingUser = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (existingUser) {
        await this.prisma.oAuthAccount.create({
          data: { userId: existingUser.id, provider, providerUserId: profile.providerUserId },
        });
        return existingUser;
      }
    }

    return this.prisma.user.create({
      data: {
        email: profile.email ?? `${provider}-${profile.providerUserId}@users.devtoolbox.dev`,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        emailVerified: Boolean(profile.email),
        oauthAccounts: { create: { provider, providerUserId: profile.providerUserId } },
      },
    });
  }

  private async exchangeGithub(code: string, redirectUri: string): Promise<OAuthProfile> {
    const clientId = this.config.get<string>("GITHUB_OAUTH_CLIENT_ID");
    const clientSecret = this.config.get<string>("GITHUB_OAUTH_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new BadRequestException("GitHub sign-in is not configured on this server.");
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new BadRequestException(`GitHub sign-in failed: ${tokenData.error ?? "unknown error"}.`);
    }

    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": "devtoolbox",
      Accept: "application/json",
    };

    const userRes = await fetch("https://api.github.com/user", { headers });
    const user = (await userRes.json()) as { id: number; login: string; email: string | null; avatar_url: string; name: string | null };

    let email = user.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
      const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
      email = emails.find((e) => e.primary && e.verified)?.email ?? null;
    }

    return {
      providerUserId: String(user.id),
      email,
      displayName: user.name ?? user.login,
      avatarUrl: user.avatar_url,
    };
  }

  private async exchangeGoogle(code: string, redirectUri: string): Promise<OAuthProfile> {
    const clientId = this.config.get<string>("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = this.config.get<string>("GOOGLE_OAUTH_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new BadRequestException("Google sign-in is not configured on this server.");
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new BadRequestException(`Google sign-in failed: ${tokenData.error ?? "unknown error"}.`);
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = (await userRes.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    return {
      providerUserId: user.sub,
      email: user.email_verified ? (user.email ?? null) : null,
      displayName: user.name ?? null,
      avatarUrl: user.picture ?? null,
    };
  }
}
