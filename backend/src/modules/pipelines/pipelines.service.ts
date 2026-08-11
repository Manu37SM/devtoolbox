import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { CreateSyncedPipelineDto, CursorQueryDto, UpdateSyncedPipelineDto } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";

// Zod validates `optionsJson` as `Record<string, unknown>` (packages/shared),
// but Prisma's generated `Json` field input type is the stricter
// `Prisma.InputJsonValue` (no `unknown`s allowed, only JSON-serializable
// values) — the payload is already JSON-serializable by construction
// (it came from a parsed request body), so this cast is safe, just not
// something Prisma's types can prove on their own.
function toInputJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Server-synced pipelines — API.md §7. Distinct from the client-only
 * pipeline builder (frontend/src/lib/pipeline*); this is what "save to my
 * account" persists. Ownership enforced in the service layer, same
 * public-or-owner model as Snippets for `getOne`/`duplicate`. */
@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, opts: CursorQueryDto) {
    const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const rows = await this.prisma.pipeline.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: { steps: { orderBy: { order: "asc" } } },
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
  }

  /** Pipelines shared into an org the caller belongs to (API.md §17) —
   * separate from `list()`, same split as SnippetsService.listForOrganization.
   * Paginated the same way `list()` is — originally an unbounded `findMany`,
   * flagged in this session's audit-hardening pass (AUDIT_REPORT.md §19). */
  async listForOrganization(userId: string, organizationId: string, opts: CursorQueryDto = {}) {
    await this.assertMember(userId, organizationId);
    const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const rows = await this.prisma.pipeline.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: { steps: { orderBy: { order: "asc" } } },
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
  }

  async create(userId: string, dto: CreateSyncedPipelineDto) {
    if (dto.organizationId) await this.assertMember(userId, dto.organizationId);
    return this.prisma.pipeline.create({
      data: {
        userId,
        organizationId: dto.organizationId,
        name: dto.name,
        description: dto.description,
        steps: {
          create: dto.steps.map((step, order) => ({
            order,
            toolSlug: step.toolSlug,
            optionsJson: toInputJson(step.optionsJson),
          })),
        },
      },
      include: { steps: { orderBy: { order: "asc" } } },
    });
  }

  // Returns the same 404 for "doesn't exist" and "exists but you can't see
  // it" — see SnippetsService.getOne's identical comment/fix
  // (AUDIT_REPORT.md §19).
  async getOne(id: string, requesterUserId: string | undefined) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    if (!pipeline || pipeline.deletedAt) throw new NotFoundException("Pipeline not found.");
    if (pipeline.isPublic || pipeline.userId === requesterUserId) return pipeline;
    if (
      pipeline.organizationId &&
      requesterUserId &&
      (await this.isMember(requesterUserId, pipeline.organizationId))
    ) {
      return pipeline;
    }
    throw new NotFoundException("Pipeline not found.");
  }

  /** Full replace of the steps array, per API.md §7's PATCH note. */
  async update(userId: string, id: string, dto: UpdateSyncedPipelineDto) {
    await this.getEditable(userId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.steps) {
        await tx.pipelineStep.deleteMany({ where: { pipelineId: id } });
      }
      return tx.pipeline.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.steps
            ? {
                steps: {
                  create: dto.steps.map((step, order) => ({
                    order,
                    toolSlug: step.toolSlug,
                    optionsJson: toInputJson(step.optionsJson),
                  })),
                },
              }
            : {}),
        },
        include: { steps: { orderBy: { order: "asc" } } },
      });
    });
  }

  async softDelete(userId: string, id: string) {
    await this.getEditable(userId, id);
    await this.prisma.pipeline.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async duplicate(userId: string, id: string) {
    const source = await this.getOne(id, userId); // throws if neither owned nor public
    return this.prisma.pipeline.create({
      data: {
        userId,
        name: `${source.name} (copy)`,
        description: source.description,
        steps: {
          create: source.steps.map((step) => ({
            order: step.order,
            toolSlug: step.toolSlug,
            // Read back as Prisma.JsonValue, re-cast to feed straight into
            // another create — see toInputJson's comment above.
            optionsJson: step.optionsJson as Prisma.InputJsonValue,
          })),
        },
      },
      include: { steps: { orderBy: { order: "asc" } } },
    });
  }

  /** Editable by the creator, or by an OWNER/ADMIN of the org it's shared into. */
  private async getEditable(userId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findUnique({ where: { id } });
    if (!pipeline || pipeline.deletedAt) throw new NotFoundException("Pipeline not found.");
    if (pipeline.userId === userId) return pipeline;
    if (pipeline.organizationId && (await this.isOrgAdmin(userId, pipeline.organizationId))) return pipeline;
    throw new ForbiddenException("You don't have permission to edit this pipeline.");
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
