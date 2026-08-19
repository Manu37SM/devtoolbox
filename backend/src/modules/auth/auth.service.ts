import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type { AuthTokenResponse, LoginDto, RegisterDto, UserProfile } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";
import { generateOpaqueToken, hashIp, hashToken } from "../../common/crypto/token-hash";
import { SecurityLogService } from "../../common/security-log/security-log.service";
import { EmailService } from "./email.service";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  ACCOUNT_LOCKOUT_MINUTES,
  EMAIL_VERIFY_TTL_HOURS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  PASSWORD_RESET_TTL_MINUTES,
  REFRESH_TOKEN_TTL_DAYS,
} from "./auth.constants";
import type { JwtAccessPayload } from "./strategies/jwt-access.strategy";

export interface IssuedRefreshToken {
  raw: string;
  expiresAt: Date;
}

/**
 * Email/password auth per API.md §2, ARCHITECTURE.md §9. OAuth lives in
 * oauth.service.ts (task-split for reviewability). Security-sensitive —
 * see CLAUDE.md rule 6: ownership checks, no plaintext secrets persisted
 * (passwords via argon2, refresh/verification tokens hashed with SHA-256
 * before storage), rotating refresh tokens with reuse detection.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly securityLog: SecurityLogService,
  ) {}

  async register(dto: RegisterDto, meta: { userAgent?: string; ip?: string }): Promise<{
    tokens: AuthTokenResponse;
    refreshToken: IssuedRefreshToken;
  }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, displayName: dto.displayName ?? null },
    });

    await this.issueEmailVerification(user.id, user.email);

    const refreshToken = await this.createSession(user.id, meta);
    return { tokens: this.buildAuthResponse(user), refreshToken };
  }

  async login(dto: LoginDto, meta: { userAgent?: string; ip?: string }): Promise<{
    tokens: AuthTokenResponse;
    refreshToken: IssuedRefreshToken;
  }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash || user.deletedAt) {
      await this.securityLog.record({
        type: "LOGIN_FAILED",
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { reason: "no_such_account" },
      });
      throw new UnauthorizedException("Invalid email or password.");
    }

    // Account lockout (checklist item #37). Checked before verifying the
    // password so a locked account can't be used to keep guessing.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.securityLog.record({
        type: "LOGIN_FAILED",
        userId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { reason: "account_locked" },
      });
      throw new UnauthorizedException(
        "This account is temporarily locked due to repeated failed login attempts. Please try again later or reset your password.",
      );
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const locking = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: locking ? 0 : attempts,
          lockedUntil: locking ? new Date(Date.now() + ACCOUNT_LOCKOUT_MINUTES * 60_000) : null,
        },
      });

      await this.securityLog.record({
        type: locking ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
        userId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { reason: "bad_password", attempts },
      });

      throw new UnauthorizedException(
        locking
          ? "This account is temporarily locked due to repeated failed login attempts. Please try again later or reset your password."
          : "Invalid email or password.",
      );
    }

    // Successful login clears any accumulated failure count/lock.
    if (user.failedLoginAttempts !== 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }
    await this.securityLog.record({ type: "LOGIN_SUCCEEDED", userId: user.id, ip: meta.ip, userAgent: meta.userAgent });

    const refreshToken = await this.createSession(user.id, meta);
    return { tokens: this.buildAuthResponse(user), refreshToken };
  }

  /**
   * Rotates the refresh token. Reuse detection: a session row is never
   * deleted on rotation, only marked `revokedAt`. If a caller presents a
   * refresh token whose session is already revoked, that's a replay of a
   * stolen/already-used token — every session for that user is revoked as
   * a precaution and the request is rejected.
   */
  async refresh(rawRefreshToken: string, meta: { userAgent?: string; ip?: string }): Promise<{
    tokens: AuthTokenResponse;
    refreshToken: IssuedRefreshToken;
  }> {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: tokenHash } });

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (session.revokedAt) {
      // Reuse of an already-rotated-out token — treat as compromise.
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.securityLog.record({
        type: "REFRESH_TOKEN_REUSE_DETECTED",
        userId: session.userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException("Refresh token reuse detected; all sessions revoked.");
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expired.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Account no longer available.");
    }

    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const refreshToken = await this.createSession(user.id, meta);
    return { tokens: this.buildAuthResponse(user), refreshToken };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Account no longer available.");
    }
    return this.toProfile(user);
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.type !== "EMAIL_VERIFY" || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException("This verification link is invalid or has expired.");
    }

    await this.prisma.$transaction([
      this.prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    ]);
  }

  /** Always resolves with no error, regardless of whether the email
   * exists — prevents account enumeration via response timing/shape. */
  async requestPasswordReset(email: string, meta: { userAgent?: string; ip?: string } = {}): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Logged even when the account doesn't exist (userId omitted) — an
    // unusual volume of these for one IP is itself a signal worth having,
    // even without a userId to attach it to.
    await this.securityLog.record({
      type: "PASSWORD_RESET_REQUESTED",
      userId: user?.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    if (!user || user.deletedAt || !user.passwordHash) return;

    const { raw, hash } = generateOpaqueToken();
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        type: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000),
      },
    });

    const link = `${this.config.get<string>("FRONTEND_URL")}/reset-password?token=${raw}`;
    await this.email.sendPasswordResetEmail(user.email, link);
  }

  async confirmPasswordReset(
    rawToken: string,
    newPassword: string,
    meta: { userAgent?: string; ip?: string } = {},
  ): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.type !== "PASSWORD_RESET" || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException("This reset link is invalid or has expired.");
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Also clears any account lockout — a successful password reset is a
      // stronger proof of ownership than the lockout mechanism is guarding
      // against, so there's no reason to leave a legitimate owner locked
      // out after they've proven control of the mailbox.
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      // Password change invalidates every existing session (defense in
      // depth in case the reset was triggered because a session leaked).
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.securityLog.record({
      type: "PASSWORD_RESET_COMPLETED",
      userId: record.userId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  // ── Internal helpers, also used by OAuthService ───────────────────────
  async createSession(userId: string, meta: { userAgent?: string; ip?: string }): Promise<IssuedRefreshToken> {
    const { raw, hash } = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000);

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hash,
        userAgent: meta.userAgent?.slice(0, 500),
        ipHash: meta.ip ? hashIp(meta.ip) : null,
        expiresAt,
      },
    });

    return { raw, expiresAt };
  }

  buildAuthResponse(user: { id: string; email: string; displayName: string | null; avatarUrl: string | null; plan: string; emailVerified: boolean; createdAt: Date }): AuthTokenResponse {
    const payload: JwtAccessPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });

    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: this.toProfile(user),
    };
  }

  private toProfile(user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    plan: string;
    emailVerified: boolean;
    createdAt: Date;
  }): UserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      plan: user.plan as UserProfile["plan"],
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async issueEmailVerification(userId: string, email: string): Promise<void> {
    const { raw, hash } = generateOpaqueToken();
    await this.prisma.verificationToken.create({
      data: {
        userId,
        tokenHash: hash,
        type: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60_000),
      },
    });

    const link = `${this.config.get<string>("FRONTEND_URL")}/verify-email?token=${raw}`;
    await this.email.sendVerificationEmail(email, link);
  }
}
