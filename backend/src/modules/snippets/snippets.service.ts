import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateSnippetDto, CursorQueryDto, UpdateSnippetDto } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Saved code/text snippets — API.md §6. Ownership enforced in the
 * service layer (CLAUDE.md rule 6 / DATABASE.md §1), not just the
 * controller: `getOne` is the one method reachable by non-owners, and it
 * only ever returns `isPublic` snippets (or org-shared ones to fellow
 * members) to them.
 *
 * Team workspaces (API.md §17): `organizationId` is additive to `userId`
 * ownership, never a replacement for it — every row still has exactly one
 * `userId` creator. Setting `organizationId` only widens *who else* can
 * view/edit it (any member for viewing; creator or org OWNER/ADMIN for
 * editing), it doesn't transfer ownership. */
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

  /** Snippets shared into an org the caller belongs to — separate from
   * `list()` (the caller's own snippets) since the two have different
   * visibility rules and are shown in different UI sections. Same
   * cursor/limit pagination as `list()` — this originally ran an unbounded
   * `findMany`, flagged in this session's audit-hardening pass
   * (AUDIT_REPORT.md §19) as a low-cost DoS lever for a large org. */
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
    // Spelled out explicitly rather than `{ userId, ...dto }` — Prisma's
    // generated `create` input is `XOR<SnippetCreateInput,
    // SnippetUncheckedCreateInput>` (relation-based vs. scalar-FK-based),
    // and TypeScript can't discriminate that union against a generic
    // spread of a DTO type that has `organizationId` typed as `string |
    // undefined` (see pipelines.service.ts's `create` for the same
    // pattern, same reason).
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

  // Returns the same 404 for "doesn't exist" and "exists but you can't see
  // it" — same convention as ApiKeysService.revokeKey. Originally returned
  // 403 for the private-and-not-mine case, which let an authenticated
  // caller distinguish "exists but private" from "doesn't exist" for any
  // guessed UUID; flagged in this session's audit-hardening pass
  // (AUDIT_REPORT.md §19) and unified here.
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

  /** Editable by the creator, or by an OWNER/ADMIN of the org it's shared
   * into (not by ordinary members, who only get view/duplicate). */
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
