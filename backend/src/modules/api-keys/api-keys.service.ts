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

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async createKey(userId: string, name: string): Promise<ApiKeyCreatedResult> {
    const raw = `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
    const keyPrefix = raw.slice(0, KEY_PREFIX.length + 4);
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

      throw new NotFoundException("API key not found.");
    }
    if (key.revokedAt) return;

    await this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async validateKey(rawKey: string): Promise<ApiKeyPrincipal> {
    const keyHash = hashToken(rawKey);
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: { select: { id: true, email: true, plan: true } } },
    });

    if (!key || key.revokedAt) {
      throw new UnauthorizedException("Invalid or revoked API key.");
    }

    const effectivePlan = await resolveEffectivePlan(this.prisma, key.user.id, key.user.plan);
    if (effectivePlan !== "PRO" && effectivePlan !== "TEAM") {
      throw new ForbiddenException("The Public API requires a PRO or TEAM plan.");
    }

    void this.prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {

    });

    return { userId: key.user.id, email: key.user.email, plan: effectivePlan };
  }
}
