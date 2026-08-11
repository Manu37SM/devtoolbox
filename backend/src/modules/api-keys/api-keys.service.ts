import { randomBytes } from "node:crypto";
import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { ApiKeyCreatedResult, ApiKeySummary } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";
import { hashToken } from "../../common/crypto/token-hash";
import { resolveEffectivePlan } from "../../common/plan/effective-plan";

const KEY_PREFIX = "dtb_live_";

export interface ApiKeyPrincipal {
  userId: string;
  email: string;
  plan: "FREE" | "PRO" | "TEAM";
}

/**
 * Manages Public API keys (API.md §11) — creation/listing/revocation are
 * session-authed (a signed-in user managing their own keys), separate from
 * `validateKey`, which is what `ApiKeyAuthGuard` calls on every §12 Public
 * API request. Same hashed-secret convention as Session.refreshTokenHash /
 * VerificationToken.tokenHash (`token-hash.ts`) — the raw key is generated
 * here, returned to the caller exactly once, and never stored.
 */
@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async createKey(userId: string, name: string): Promise<ApiKeyCreatedResult> {
    const raw = `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
    const keyPrefix = raw.slice(0, KEY_PREFIX.length + 4); // e.g. "dtb_live_ab12" — just enough to tell keys apart in the UI
    const keyHash = hashToken(raw);

    const created = await this.prisma.apiKey.create({
      data: { userId, name, keyPrefix, keyHash },
    });

    return {
      id: created.id,
      name: created.name,
      key: raw,
      keyPrefix: created.keyPrefix,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listKeys(userId: string): Promise<ApiKeySummary[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      revokedAt: k.revokedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }));
  }

  async revokeKey(userId: string, id: string): Promise<void> {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.userId !== userId) {
      // Same 404 for "doesn't exist" and "belongs to someone else" — never
      // confirm another user's key ID exists.
      throw new NotFoundException("API key not found.");
    }
    if (key.revokedAt) return; // already revoked — idempotent

    await this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  /** Called by ApiKeyAuthGuard on every Public API request. Returns the
   * owning user's principal (used to populate `req.user` so
   * `PlanThrottleGuard` can compose after this guard). Throws
   * UnauthorizedException (401, "who are you") if the key is
   * missing/invalid/revoked, ForbiddenException (403, "I know who you are,
   * you can't do this") if the owning account isn't PRO/TEAM (Public API is
   * a paid tier — ARCHITECTURE.md §14.3) — matches API.md §12's documented
   * status codes. Updates `lastUsedAt` best-effort (not awaited into the
   * hot path's latency). */
  async validateKey(rawKey: string): Promise<ApiKeyPrincipal> {
    const keyHash = hashToken(rawKey);
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: { select: { id: true, email: true, plan: true } } },
    });

    if (!key || key.revokedAt) {
      throw new UnauthorizedException("Invalid or revoked API key.");
    }
    // Effective plan (API.md §17) — a FREE-plan member of a TEAM-owner's
    // organization can use the Public API too, same as they get the "pro"
    // rate-limit tier from PlanThrottleGuard.
    const effectivePlan = await resolveEffectivePlan(this.prisma, key.user.id, key.user.plan);
    if (effectivePlan !== "PRO" && effectivePlan !== "TEAM") {
      throw new ForbiddenException("The Public API requires a PRO or TEAM plan.");
    }

    void this.prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {
      // Best-effort — a failed lastUsedAt bump shouldn't fail the request.
    });

    return { userId: key.user.id, email: key.user.email, plan: effectivePlan };
  }
}
