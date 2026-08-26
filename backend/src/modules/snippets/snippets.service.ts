import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateSnippetDto, CursorQueryDto, UpdateSnippetDto } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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

  async listForOrganization(userId: string, organizationId: string, opts: CursorQueryDto = {}) {
    await this.assertMember(userId, organizationId);
    const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const rows = await this.prisma.snippet.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
  }

  async create(userId: string, dto: CreateSnippetDto) {
    if (dto.organizationId) await this.assertMember(userId, dto.organizationId);

    return this.prisma.snippet.create({
      data: {
        userId,
        organizationId: dto.organizationId,
        toolSlug: dto.toolSlug,
        title: dto.title,
        content: dto.content,
        isPublic: dto.isPublic,
      },
    });
  }

  async getOne(id: string, requesterUserId: string | undefined) {
    const snippet = await this.prisma.snippet.findUnique({ where: { id } });
    if (!snippet || snippet.deletedAt) throw new NotFoundException("Snippet not found.");
    if (snippet.isPublic || snippet.userId === requesterUserId) return snippet;
    if (snippet.organizationId && requesterUserId && (await this.isMember(requesterUserId, snippet.organizationId))) {
      return snippet;
    }
    throw new NotFoundException("Snippet not found.");
  }

  async update(userId: string, id: string, dto: UpdateSnippetDto) {
    const snippet = await this.getEditable(userId, id);
    return this.prisma.snippet.update({ where: { id: snippet.id }, data: dto });
  }

  async softDelete(userId: string, id: string) {
    const snippet = await this.getEditable(userId, id);
    await this.prisma.snippet.update({ where: { id: snippet.id }, data: { deletedAt: new Date() } });
  }

  private async getEditable(userId: string, id: string) {
    const snippet = await this.prisma.snippet.findUnique({ where: { id } });
    if (!snippet || snippet.deletedAt) throw new NotFoundException("Snippet not found.");
    if (snippet.userId === userId) return snippet;
    if (snippet.organizationId && (await this.isOrgAdmin(userId, snippet.organizationId))) return snippet;
    throw new ForbiddenException("You don't have permission to edit this snippet.");
  }

  private async isMember(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    return membership !== null;
  }

  private async isOrgAdmin(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    return membership?.role === "OWNER" || membership?.role === "ADMIN";
  }

  private async assertMember(userId: string, organizationId: string): Promise<void> {
    if (!(await this.isMember(userId, organizationId))) {
      throw new ForbiddenException("You're not a member of this organization.");
    }
  }
}
