import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AddOrganizationMemberDto,
  CreateOrganizationDto,
  OrganizationDetail,
  OrganizationSummary,
  OrganizationUsageSummary,
  UpdateOrganizationDto,
  UpdateOrganizationMemberRoleDto,
} from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";

const USAGE_PERIOD_DAYS = 30;
const MAX_MEMBERS_FOR_USAGE = 500;

/**
 * Team workspaces (API.md §17, Phase 4 MVP scope). Deliberately narrow —
 * see ARCHITECTURE.md §14.2 and AUDIT_REPORT.md §17.2 for what's out of
 * scope in this pass (SSO, custom branding, org-level Stripe billing,
 * email-token invite/accept flow). Members are added directly by email if
 * they already have a DevToolbox account; there's no pending-invite state.
 */
@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto): Promise<OrganizationSummary> {
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        members: { create: { userId, role: "OWNER" } },
      },
    });
    return { id: org.id, name: org.name, role: "OWNER", createdAt: org.createdAt.toISOString() };
  }

  async listForUser(userId: string): Promise<OrganizationSummary[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
      createdAt: m.organization.createdAt.toISOString(),
    }));
  }

  async getDetail(userId: string, organizationId: string): Promise<OrganizationDetail> {
    const membership = await this.requireMembership(userId, organizationId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
    });
    if (!org) throw new NotFoundException("Organization not found.");

    return {
      id: org.id,
      name: org.name,
      role: membership.role,
      createdAt: org.createdAt.toISOString(),
      members: org.members.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        displayName: m.user.displayName,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }

  async rename(userId: string, organizationId: string, dto: UpdateOrganizationDto): Promise<OrganizationSummary> {
    await this.requireRole(userId, organizationId, ["OWNER"]);
    const org = await this.prisma.organization.update({ where: { id: organizationId }, data: { name: dto.name } });
    return { id: org.id, name: org.name, role: "OWNER", createdAt: org.createdAt.toISOString() };
  }

  async delete(userId: string, organizationId: string): Promise<void> {
    await this.requireRole(userId, organizationId, ["OWNER"]);
    // Snippet.organizationId / Pipeline.organizationId are ON DELETE SET
    // NULL (DATABASE.md) — members keep their own content, only the
    // org-shared *visibility* is removed, per API.md §17's DELETE note.
    await this.prisma.organization.delete({ where: { id: organizationId } });
  }

  async addMember(userId: string, organizationId: string, dto: AddOrganizationMemberDto) {
    await this.requireRole(userId, organizationId, ["OWNER", "ADMIN"]);

    const targetUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!targetUser) {
      throw new NotFoundException(
        "No DevToolbox account found for that email. They'll need to sign up before they can be added.",
      );
    }

    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUser.id } },
    });
    if (existing) throw new ConflictException("This user is already a member.");

    const member = await this.prisma.organizationMember.create({
      data: { organizationId, userId: targetUser.id, role: "MEMBER" },
    });
    return {
      userId: targetUser.id,
      email: targetUser.email,
      displayName: targetUser.displayName,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    };
  }

  async updateMemberRole(
    userId: string,
    organizationId: string,
    targetUserId: string,
    dto: UpdateOrganizationMemberRoleDto,
  ) {
    await this.requireRole(userId, organizationId, ["OWNER"]);

    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException("Member not found.");

    // dto.role can only ever be ADMIN/MEMBER (UpdateOrganizationMemberRoleSchema
    // deliberately excludes OWNER — promotion to OWNER isn't exposed via this
    // endpoint), so any target currently OWNER is necessarily being demoted.
    if (target.role === "OWNER") {
      await this.assertNotLastOwner(organizationId);
    }

    const updated = await this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
      data: { role: dto.role },
    });
    return { userId: targetUserId, role: updated.role };
  }

  async removeMember(userId: string, organizationId: string, targetUserId: string): Promise<void> {
    const isSelf = userId === targetUserId;
    if (!isSelf) {
      await this.requireRole(userId, organizationId, ["OWNER", "ADMIN"]);
    } else {
      await this.requireMembership(userId, organizationId);
    }

    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException("Member not found.");

    if (target.role === "OWNER") {
      await this.assertNotLastOwner(organizationId);
    }

    await this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });
  }

  /** Aggregate AI usage across every member, last 30 days — same
   * underlying AiUsageEvent rows as the personal /ai/usage endpoint
   * (ai-gateway.service.ts's getUsage), never raw prompt/response content
   * (CLAUDE.md rule 8). OWNER/ADMIN only.
   *
   * Aggregated in the database (`groupBy`), not by pulling every event row
   * into Node and reducing in memory — the original version did the latter
   * with no limit on either the member list or the event rows fetched,
   * flagged as a low-cost DoS lever for a large/active org in this
   * session's audit-hardening pass (AUDIT_REPORT.md §19). `MAX_MEMBERS_FOR_USAGE`
   * caps the member list defensively even though real orgs are unlikely to
   * approach it yet. */
  async getUsage(userId: string, organizationId: string): Promise<OrganizationUsageSummary> {
    await this.requireRole(userId, organizationId, ["OWNER", "ADMIN"]);

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true } } },
      take: MAX_MEMBERS_FOR_USAGE,
    });
    const memberIds = members.map((m) => m.userId);

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - USAGE_PERIOD_DAYS);

    const grouped = await this.prisma.aiUsageEvent.groupBy({
      by: ["userId"],
      where: { userId: { in: memberIds }, createdAt: { gte: periodStart } },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true },
    });
    const byUserId = new Map(grouped.map((g) => [g.userId, g]));

    const byMember = members.map((m) => {
      const g = byUserId.get(m.userId);
      return {
        userId: m.userId,
        email: m.user.email,
        requests: g?._count._all ?? 0,
        inputTokens: g?._sum.inputTokens ?? 0,
        outputTokens: g?._sum.outputTokens ?? 0,
      };
    });

    return {
      organizationId,
      periodDays: USAGE_PERIOD_DAYS,
      totalRequests: byMember.reduce((sum, m) => sum + m.requests, 0),
      totalInputTokens: byMember.reduce((sum, m) => sum + m.inputTokens, 0),
      totalOutputTokens: byMember.reduce((sum, m) => sum + m.outputTokens, 0),
      byMember,
    };
  }

  private async requireMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership) throw new ForbiddenException("You're not a member of this organization.");
    return membership;
  }

  private async requireRole(userId: string, organizationId: string, roles: ("OWNER" | "ADMIN")[]) {
    const membership = await this.requireMembership(userId, organizationId);
    if (!roles.includes(membership.role as "OWNER" | "ADMIN")) {
      throw new ForbiddenException("You don't have permission to do this.");
    }
    return membership;
  }

  private async assertNotLastOwner(organizationId: string): Promise<void> {
    const ownerCount = await this.prisma.organizationMember.count({ where: { organizationId, role: "OWNER" } });
    if (ownerCount <= 1) {
      throw new ConflictException("An organization must have at least one OWNER.");
    }
  }
}
