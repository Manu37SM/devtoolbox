import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateSnippetDto, CursorQueryDto, UpdateSnippetDto } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Saved code/text snippets — API.md §6. Ownership enforced in the
 * service layer (CLAUDE.md rule 6 / DATABASE.md §1), not just the
 * controller: `getOne` is the one method reachable by non-owners, and it
 * only ever returns `isPublic` snippets to them. */
@Injectable()
export class SnippetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, opts: CursorQueryDto & { toolSlug?: string }) {
    const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const rows = await this.prisma.snippet.findMany({
      where: { userId, deletedAt: null, ...(opts.toolSlug ? { toolSlug: opts.toolSlug } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
  }

  async create(userId: string, dto: CreateSnippetDto) {
    return this.prisma.snippet.create({ data: { userId, ...dto } });
  }

  async getOne(id: string, requesterUserId: string | undefined) {
    const snippet = await this.prisma.snippet.findUnique({ where: { id } });
    if (!snippet || snippet.deletedAt) throw new NotFoundException("Snippet not found.");
    if (snippet.isPublic || snippet.userId === requesterUserId) return snippet;
    throw new ForbiddenException("This snippet is private.");
  }

  async update(userId: string, id: string, dto: UpdateSnippetDto) {
    const snippet = await this.getOwned(userId, id);
    return this.prisma.snippet.update({ where: { id: snippet.id }, data: dto });
  }

  async softDelete(userId: string, id: string) {
    const snippet = await this.getOwned(userId, id);
    await this.prisma.snippet.update({ where: { id: snippet.id }, data: { deletedAt: new Date() } });
  }

  private async getOwned(userId: string, id: string) {
    const snippet = await this.prisma.snippet.findUnique({ where: { id } });
    if (!snippet || snippet.deletedAt) throw new NotFoundException("Snippet not found.");
    if (snippet.userId !== userId) throw new ForbiddenException("You don't own this snippet.");
    return snippet;
  }
}
