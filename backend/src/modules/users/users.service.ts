import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { UpdateProfileDto, UserProfile } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";
import { BillingService } from "../billing/billing.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.findActiveUser(userId);
    return this.toProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    await this.findActiveUser(userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });
    return this.toProfile(user);
  }

  /** Soft-delete per DATABASE.md §1 (30-day grace period) — the account
   * row stays but is excluded from lookups everywhere else via the
   * `deletedAt` check; hard-purge is a scheduled job, out of scope here.
   * All sessions are revoked immediately so existing tokens stop working
   * right away even though the row survives.
   *
   * Cancels the user's underlying Razorpay subscription first (closes
   * AUDIT_REPORT.md §15.2's disclosed gap — soft-delete used to revoke app
   * access but leave billing running indefinitely). Cancellation happens
   * *before* the soft-delete transaction, not after: if it fails partway,
   * we want the account to still show as active/billed rather than
   * silently deleted-but-still-being-charged. A user with no subscription,
   * or a server with billing not configured at all, is not an error here —
   * both are the common case (most users are on the free plan) and must
   * not block account deletion. */
  async softDelete(userId: string): Promise<void> {
    await this.findActiveUser(userId);

    try {
      await this.billing.cancelSubscription(userId);
    } catch (err) {
      if (!(err instanceof NotFoundException) && !(err instanceof ServiceUnavailableException)) {
        throw err;
      }
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /** GDPR-style data export — every table with a `userId` FK, minus
   * anything secret (password hash, session/verification token hashes).
   * See API.md §3 `GET /users/me/export`. */
  async exportData(userId: string) {
    await this.findActiveUser(userId);

    const [user, favorites, historyEntries, snippets, pipelines, shareLinks, oauthAccounts] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.favorite.findMany({ where: { userId } }),
      this.prisma.historyEntry.findMany({ where: { userId } }),
      this.prisma.snippet.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.pipeline.findMany({ where: { userId, deletedAt: null }, include: { steps: true } }),
      this.prisma.shareLink.findMany({ where: { userId } }),
      this.prisma.oAuthAccount.findMany({ where: { userId }, select: { provider: true, createdAt: true } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: this.toProfile(user),
      favorites,
      historyEntries,
      snippets,
      pipelines,
      shareLinks,
      oauthAccounts,
    };
  }

  private async findActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException("Account not found.");
    }
    return user;
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
}
