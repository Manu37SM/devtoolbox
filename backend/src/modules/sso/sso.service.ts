import { randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { SAML } from "@node-saml/node-saml";
import type { SsoConnectionSummary, SsoDiscoveryResult, UpsertSsoConnectionDto } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";
import { encryptSecret, decryptSecret } from "../../common/crypto/secret-encryption";
import { AuthService, type IssuedRefreshToken } from "../auth/auth.service";
import type { AuthTokenResponse } from "@devtoolbox/shared";

interface OidcDiscoveryDocument {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

@Injectable()
export class SsoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async getConnection(userId: string, organizationId: string): Promise<SsoConnectionSummary | null> {
    await this.requireRole(userId, organizationId, ["OWNER", "ADMIN"]);
    const conn = await this.prisma.ssoConnection.findUnique({ where: { organizationId } });
    return conn ? this.toSummary(conn) : null;
  }

  async upsertConnection(userId: string, organizationId: string, dto: UpsertSsoConnectionDto): Promise<SsoConnectionSummary> {
    await this.requireRole(userId, organizationId, ["OWNER"]);

    const existing = await this.prisma.ssoConnection.findUnique({ where: { organizationId } });

    if (dto.protocol === "OIDC") {
      const masterKey = this.config.get<string>("SSO_SECRET_ENCRYPTION_KEY");
      if (!masterKey) {
        throw new ServiceUnavailableException("SSO is not configured on this server (missing SSO_SECRET_ENCRYPTION_KEY).");
      }

      if (!existing && !dto.oidcClientSecret) {
        throw new BadRequestException("oidcClientSecret is required when first configuring OIDC SSO.");
      }
      const oidcClientSecretEnc = dto.oidcClientSecret
        ? encryptSecret(masterKey, organizationId, dto.oidcClientSecret)
        : existing?.oidcClientSecretEnc ?? null;

      const conn = await this.upsertRow(organizationId, existing?.id, {
        protocol: "OIDC",
        domain: dto.domain.toLowerCase(),
        oidcIssuer: dto.oidcIssuer,
        oidcClientId: dto.oidcClientId,
        oidcClientSecretEnc,
        samlEntryPoint: null,
        samlIssuer: null,
        samlCert: null,
      });
      return this.toSummary(conn);
    }

    const conn = await this.upsertRow(organizationId, existing?.id, {
      protocol: "SAML",
      domain: dto.domain.toLowerCase(),
      oidcIssuer: null,
      oidcClientId: null,
      oidcClientSecretEnc: null,
      samlEntryPoint: dto.samlEntryPoint,
      samlIssuer: dto.samlIssuer,
      samlCert: dto.samlCert,
    });
    return this.toSummary(conn);
  }

  async setEnabled(userId: string, organizationId: string, enabled: boolean): Promise<SsoConnectionSummary> {
    await this.requireRole(userId, organizationId, ["OWNER"]);
    const conn = await this.prisma.ssoConnection.update({ where: { organizationId }, data: { enabled } });
    return this.toSummary(conn);
  }

  async deleteConnection(userId: string, organizationId: string): Promise<void> {
    await this.requireRole(userId, organizationId, ["OWNER"]);
    await this.prisma.ssoConnection.deleteMany({ where: { organizationId } });
  }

  async discover(domain: string): Promise<SsoDiscoveryResult> {
    const conn = await this.prisma.ssoConnection.findUnique({ where: { domain: domain.toLowerCase() } });
    if (!conn || !conn.enabled) return { available: false, protocol: null, organizationId: null };
    return { available: true, protocol: conn.protocol, organizationId: conn.organizationId };
  }

  async buildOidcAuthorizeUrl(domain: string, redirectUri: string): Promise<{ url: string; state: string }> {
    this.requireOwnOriginRedirect(redirectUri);
    const conn = await this.requireEnabledConnection(domain, "OIDC");
    const discovery = await this.fetchOidcDiscovery(conn.oidcIssuer!);
    const nonce = cryptoRandomString();
    const state = Buffer.from(JSON.stringify({ connectionId: conn.id, nonce })).toString("base64url");

    const url = new URL(discovery.authorization_endpoint);
    url.searchParams.set("client_id", conn.oidcClientId!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    return { url: url.toString(), state };
  }

  async handleOidcCallback(
    code: string,
    state: string,
    redirectUri: string,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{ tokens: AuthTokenResponse; refreshToken: IssuedRefreshToken }> {
    this.requireOwnOriginRedirect(redirectUri);
    const masterKey = this.config.get<string>("SSO_SECRET_ENCRYPTION_KEY");
    if (!masterKey) throw new ServiceUnavailableException("SSO is not configured on this server.");

    let decodedState: { connectionId: string; nonce: string };
    try {
      decodedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    } catch {
      throw new BadRequestException("Invalid SSO state.");
    }

    const conn = await this.prisma.ssoConnection.findUnique({ where: { id: decodedState.connectionId } });
    if (!conn || !conn.enabled || conn.protocol !== "OIDC") {
      throw new BadRequestException("This SSO connection is no longer available.");
    }
    const clientSecret = decryptSecret(masterKey, conn.organizationId, conn.oidcClientSecretEnc);
    if (!clientSecret) throw new BadRequestException("This SSO connection has no client secret configured.");

    const discovery = await this.fetchOidcDiscovery(conn.oidcIssuer!);

    const tokenRes = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: conn.oidcClientId!,
        client_secret: clientSecret,
      }).toString(),
    });
    const tokenData = (await tokenRes.json()) as { id_token?: string; error?: string };
    if (!tokenData.id_token) {
      throw new BadRequestException(`SSO sign-in failed: ${tokenData.error ?? "no id_token returned"}.`);
    }

    const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
    const { payload } = await jwtVerify(tokenData.id_token, jwks, {
      issuer: conn.oidcIssuer!,
      audience: conn.oidcClientId!,
    });
    if (payload.nonce !== decodedState.nonce) {
      throw new UnauthorizedException("SSO sign-in failed: nonce mismatch (possible replay).");
    }

    const sub = String(payload.sub);
    const email = typeof payload.email === "string" ? payload.email : null;
    const displayName = typeof payload.name === "string" ? payload.name : null;
    const avatarUrl = typeof payload.picture === "string" ? payload.picture : null;

    const user = await this.findOrProvisionUser(conn.id, conn.organizationId, conn.domain, sub, email, displayName, avatarUrl);
    const refreshToken = await this.authService.createSession(user.id, meta);
    return { tokens: this.authService.buildAuthResponse(user), refreshToken };
  }

  async buildSamlAuthorizeUrl(domain: string, callbackUrl: string): Promise<string> {
    const conn = await this.requireEnabledConnection(domain, "SAML");
    const saml = this.buildSamlClient(conn, callbackUrl);

    return saml.getAuthorizeUrlAsync(conn.id, undefined, {});
  }

  async handleSamlCallback(
    samlResponseBody: string,
    relayState: string | undefined,
    callbackUrl: string,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{ tokens: AuthTokenResponse; refreshToken: IssuedRefreshToken }> {
    if (!relayState) throw new BadRequestException("Missing SSO relay state.");
    const conn = await this.prisma.ssoConnection.findUnique({ where: { id: relayState } });
    if (!conn || !conn.enabled || conn.protocol !== "SAML") {
      throw new BadRequestException("This SSO connection is no longer available.");
    }

    const saml = this.buildSamlClient(conn, callbackUrl);
    const { profile } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponseBody });
    if (!profile?.nameID) {
      throw new UnauthorizedException("SSO sign-in failed: no NameID in SAML assertion.");
    }

    const email = profile.email ?? (profile.nameID.includes("@") ? profile.nameID : null);
    const displayName = typeof profile["displayName"] === "string" ? (profile["displayName"] as string) : null;

    const user = await this.findOrProvisionUser(conn.id, conn.organizationId, conn.domain, profile.nameID, email, displayName, null);
    const refreshToken = await this.authService.createSession(user.id, meta);
    return { tokens: this.authService.buildAuthResponse(user), refreshToken };
  }

  private async findOrProvisionUser(
    ssoConnectionId: string,
    organizationId: string,
    domain: string,
    externalId: string,
    email: string | null,
    displayName: string | null,
    avatarUrl: string | null,
  ) {
    const existingIdentity = await this.prisma.ssoIdentity.findUnique({
      where: { ssoConnectionId_externalId: { ssoConnectionId, externalId } },
    });

    let user;
    if (existingIdentity) {
      user = await this.prisma.user.findUnique({ where: { id: existingIdentity.userId } });
      if (!user || user.deletedAt) throw new UnauthorizedException("Account no longer available.");
    } else {
      if (!email) throw new BadRequestException("SSO sign-in failed: identity provider did not return an email address.");
      if (!email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)) {
        throw new ForbiddenException(
          `SSO sign-in failed: this connection is only authorized for @${domain} addresses.`,
        );
      }
      const existingUser = await this.prisma.user.findUnique({ where: { email } });
      user = existingUser
        ? await this.prisma.user.update({
            where: { id: existingUser.id },
            data: { ssoIdentities: { create: { ssoConnectionId, externalId } } },
          })
        : await this.prisma.user.create({
            data: {
              email,
              displayName,
              avatarUrl,
              emailVerified: true,
              ssoIdentities: { create: { ssoConnectionId, externalId } },
            },
          });
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.id } },
    });
    if (!membership) {
      await this.prisma.organizationMember.create({ data: { organizationId, userId: user.id, role: "MEMBER" } });
    }

    return user;
  }

  private buildSamlClient(
    conn: { samlEntryPoint: string | null; samlIssuer: string | null; samlCert: string | null },
    callbackUrl: string,
  ): SAML {
    if (!conn.samlEntryPoint || !conn.samlIssuer || !conn.samlCert) {
      throw new BadRequestException("This SSO connection is missing required SAML configuration.");
    }

    return new SAML({
      entryPoint: conn.samlEntryPoint,

      idpCert: conn.samlCert,
      issuer: this.config.get<string>("FRONTEND_URL") ?? "https://devtoolbox.dev",
      callbackUrl,
      wantAssertionsSigned: true,
    });
  }

  private async fetchOidcDiscovery(issuer: string): Promise<OidcDiscoveryDocument> {
    const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
    const res = await fetch(url);
    if (!res.ok) throw new BadRequestException(`Could not reach identity provider's OIDC discovery document (${url}).`);
    return (await res.json()) as OidcDiscoveryDocument;
  }

  private requireOwnOriginRedirect(redirectUri: string): void {
    const frontendUrl = this.config.get<string>("FRONTEND_URL") ?? "https://devtoolbox.dev";
    let expectedOrigin: string;
    let actualOrigin: string;
    try {
      expectedOrigin = new URL(frontendUrl).origin;
      actualOrigin = new URL(redirectUri).origin;
    } catch {
      throw new BadRequestException("Invalid redirectUri.");
    }
    if (actualOrigin !== expectedOrigin) {
      throw new BadRequestException("redirectUri must be on this app's own origin.");
    }
  }

  private async requireEnabledConnection(domain: string, protocol: "OIDC" | "SAML") {
    const conn = await this.prisma.ssoConnection.findUnique({ where: { domain: domain.toLowerCase() } });
    if (!conn || !conn.enabled || conn.protocol !== protocol) {
      throw new NotFoundException("No SSO connection configured for this domain.");
    }
    return conn;
  }

  private async requireRole(userId: string, organizationId: string, roles: ("OWNER" | "ADMIN")[]) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership) throw new ForbiddenException("You're not a member of this organization.");
    if (!roles.includes(membership.role as "OWNER" | "ADMIN")) {
      throw new ForbiddenException("You don't have permission to do this.");
    }
    return membership;
  }

  private async upsertRow(
    organizationId: string,
    existingId: string | undefined,
    data: {
      protocol: "OIDC" | "SAML";
      domain: string;
      oidcIssuer: string | null;
      oidcClientId: string | null;
      oidcClientSecretEnc: string | null;
      samlEntryPoint: string | null;
      samlIssuer: string | null;
      samlCert: string | null;
    },
  ) {
    try {
      return existingId
        ? await this.prisma.ssoConnection.update({ where: { id: existingId }, data })
        : await this.prisma.ssoConnection.create({ data: { organizationId, ...data } });
    } catch (err) {

      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        throw new ConflictException("This domain is already registered to another organization's SSO connection.");
      }
      throw err;
    }
  }

  private toSummary(conn: {
    protocol: "OIDC" | "SAML";
    domain: string;
    enabled: boolean;
    oidcIssuer: string | null;
    oidcClientId: string | null;
    oidcClientSecretEnc: string | null;
    samlEntryPoint: string | null;
    samlIssuer: string | null;
    samlCert: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SsoConnectionSummary {
    return {
      protocol: conn.protocol,
      domain: conn.domain,
      enabled: conn.enabled,
      oidcIssuer: conn.oidcIssuer,
      oidcClientId: conn.oidcClientId,
      oidcHasClientSecret: Boolean(conn.oidcClientSecretEnc),
      samlEntryPoint: conn.samlEntryPoint,
      samlIssuer: conn.samlIssuer,
      samlCert: conn.samlCert,
      createdAt: conn.createdAt.toISOString(),
      updatedAt: conn.updatedAt.toISOString(),
    };
  }
}

function cryptoRandomString(): string {

  return randomBytes(16).toString("hex");
}
