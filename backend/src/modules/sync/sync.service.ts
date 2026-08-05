import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AddFavoriteDto, CreateHistoryEntryDto } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";
import { decryptPreview, encryptPreview } from "../../common/crypto/history-encryption";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Favorites + History sync — API.md §4-5. Every method takes `userId`
 * from the JWT (never trusts a client-supplied ID) and every query/mutate
 * is scoped `where: { userId }`, per CLAUDE.md rule 6 / DATABASE.md §1's
 * ownership-check principle. */
@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── Favorites ───────────────────────────────────────────────────────
  async listFavorites(userId: string) {
    return this.prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  async addFavorite(userId: string, dto: AddFavoriteDto) {
    return this.prisma.favorite.upsert({
      where: { userId_toolSlug: { userId, toolSlug: dto.toolSlug } },
      create: { userId, toolSlug: dto.toolSlug },
      update: {},
    });
  }

  async removeFavorite(userId: string, toolSlug: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, toolSlug } });
  }

  // ── History ─────────────────────────────────────────────────────────
  async listHistory(userId: string, opts: { toolSlug?: string; cursor?: string; limit?: number }) {
    const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const entries = await this.prisma.historyEntry.findMany({
      where: { userId, ...(opts.toolSlug ? { toolSlug: opts.toolSlug } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });

    const hasMore = entries.length > limit;
    const page = hasMore ? entries.slice(0, limit) : entries;
    const key = this.config.getOrThrow<string>("HISTORY_ENCRYPTION_KEY");

    return {
      items: page.map((entry) => ({
        id: entry.id,
        toolSlug: entry.toolSlug,
        inputPreview: decryptPreview(key, entry.inputPreview),
        outputPreview: decryptPreview(key, entry.outputPreview),
        createdAt: entry.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    };
  }

  async createHistoryEntry(userId: string, dto: CreateHistoryEntryDto) {
    const key = this.config.getOrThrow<string>("HISTORY_ENCRYPTION_KEY");
    const entry = await this.prisma.historyEntry.create({
      data: {
        userId,
        toolSlug: dto.toolSlug,
        inputPreview: encryptPreview(key, dto.inputPreview),
        outputPreview: encryptPreview(key, dto.outputPreview),
      },
    });
    return { id: entry.id, toolSlug: entry.toolSlug, createdAt: entry.createdAt.toISOString() };
  }

  async deleteHistoryEntry(userId: string, id: string) {
    const entry = await this.prisma.historyEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException("History entry not found.");
    if (entry.userId !== userId) throw new ForbiddenException("You don't own this history entry.");
    await this.prisma.historyEntry.delete({ where: { id } });
  }

  async clearHistory(userId: string) {
    await this.prisma.historyEntry.deleteMany({ where: { userId } });
  }
}
