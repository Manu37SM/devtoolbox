import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AcceptOrganizationInviteResult,
  AddOrganizationMemberDto,
  AddOrganizationMemberResult,
  CreateOrganizationDto,
  OrganizationDetail,
  OrganizationInviteSummary,
  OrganizationSummary,
  OrganizationUsageSummary,
  UpdateOrganizationBrandingDto,
  UpdateOrganizationDto,
  UpdateOrganizationMemberRoleDto,
} from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";
import { generateOpaqueToken, hashToken } from "../../common/crypto/token-hash";
import { EmailService } from "../auth/email.service";

const USAGE_PERIOD_DAYS = 30;
const MAX_MEMBERS_FOR_USAGE = 500;
const ORG_INVITE_TTL_DAYS = 7;

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto): Promise<OrganizationSummary> {
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        members: { create: { userId, role: "OWNER" } },
      },
    });
    return {
      id: org.id,
      name: org.name,
      role: "OWNER",
      createdAt: org.createdAt.toISOString(),
      brandName: org.brandName,
      brandLogoUrl: org.brandLogoUrl,
    };
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
      brandName: m.organization.brandName,
      brandLogoUrl: m.organization.brandLogoUrl,
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
      brandName: org.brandName,
      brandLogoUrl: org.brandLogoUrl,
      members: org.members.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        displayName: m.user.displayName,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }

  async updateBranding(userId: string, organizationId: string, dto: UpdateOrganizationBrandingDto): Promise<OrganizationSummary> {
    await this.requireRole(userId, organizationId, ["OWNER"]);
    const org = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.brandName !== undefined ? { brandName: dto.brandName } : {}),
        ...(dto.brandLogoUrl !== undefined ? { brandLogoUrl: dto.brandLogoUrl } : {}),
      },
    });
    return {
      id: org.id,
      name: org.name,
      role: "OWNER",
      createdAt: org.createdAt.toISOString(),
      brandName: org.brandName,
      brandLogoUrl: org.brandLogoUrl,
    };
  }

  async rename(userId: string, organizationId: string, dto: UpdateOrganizationDto): Promise<OrganizationSummary> {
    await this.requireRole(userId, organizationId, ["OWNER"]);
    const org = await this.prisma.organization.update({ where: { id: organizationId }, data: { name: dto.name } });
    return {
      id: org.id,
      name: org.name,
      role: "OWNER",
      createdAt: org.createdAt.toISOString(),
      brandName: org.brandName,
      brandLogoUrl: org.brandLogoUrl,
    };
  }

  async delete(userId: string, organizationId: string): Promise<void> {
    await this.requireRole(userId, organizationId, ["OWNER"]);

    await this.prisma.organization.delete({ where: { id: organizationId } });
  }

  async addMember(userId: string, organizationId: string, dto: AddOrganizationMemberDto): Promise<AddOrganizationMemberResult> {
    await this.requireRole(userId, organizationId, ["OWNER", "ADMIN"]);

    const targetUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!targetUser) {
      const invite = await this.createOrRefreshInvite(organizationId, dto.email, userId);
      return { status: "invited", invite };
    }

    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUser.id } },
    });
    if (existing) throw new ConflictException("This user is already a member.");

    const member = await this.prisma.organizationMember.create({
      data: { organizationId, userId: targetUser.id, role: "MEMBER" },
    });
    return {
      status: "added",
      member: {
        userId: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.displayName,
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
      },
    };
  }

  async listInvites(userId: string, organizationId: string): Promise<OrganizationInviteSummary[]> {
    await this.requireRole(userId, organizationId, ["OWNER", "ADMIN"]);
    const invites = await this.prisma.organizationInvite.findMany({
      where: { organizationId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { invitedByUser: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return invites.map((i: Parameters<OrganizationsService["toInviteSummary"]>[0]) => this.toInviteSummary(i));
  }

  async revokeInvite(userId: string, organizationId: string, inviteId: string): Promise<void> {
    await this.requireRole(userId, organizationId, ["OWNER", "ADMIN"]);
    const invite = await this.prisma.organizationInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.organizationId !== organizationId) {
      throw new NotFoundException("Invite not found.");
    }
    if (invite.acceptedAt) {
      throw new ConflictException("This invite has already been accepted — remove the member instead.");
    }
    if (invite.revokedAt) return;

    await this.prisma.organizationInvite.update({ where: { id: inviteId }, data: { revokedAt: new Date() } });
  }

  async acceptInvite(userId: string, rawToken: string): Promise<AcceptOrganizationInviteResult> {
    const tokenHash = hashToken(rawToken);
    const invite = await this.prisma.organizationInvite.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });
    if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new UnauthorizedException("This invite link is invalid or has expired.");
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenException("This invite was sent to a different email address — sign in with that address to accept it.");
    }

    const existingMembership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId } },
    });

    await this.prisma.$transaction([
      this.prisma.organizationInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),

      ...(existingMembership
        ? []
        : [this.prisma.organizationMember.create({ data: { organizationId: invite.organizationId, userId, role: invite.role } })]),
    ]);

    return {
      organizationId: invite.organizationId,
      organizationName: invite.organization.name,
      role: existingMembership?.role ?? invite.role,
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

  private async createOrRefreshInvite(organizationId: string, email: string, invitedByUserId: string): Promise<OrganizationInviteSummary> {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    const { raw, hash } = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + ORG_INVITE_TTL_DAYS * 24 * 60 * 60_000);

    const existing = await this.prisma.organizationInvite.findFirst({
      where: { organizationId, email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    const invite = existing
      ? await this.prisma.organizationInvite.update({
          where: { id: existing.id },
          data: { tokenHash: hash, expiresAt, invitedByUserId },
          include: { invitedByUser: { select: { email: true } } },
        })
      : await this.prisma.organizationInvite.create({
          data: { organizationId, email, tokenHash: hash, expiresAt, invitedByUserId },
          include: { invitedByUser: { select: { email: true } } },
        });

    const link = `${this.config.get<string>("FRONTEND_URL")}/invites/${raw}`;
    await this.email.sendOrgInviteEmail(email, org.name, link);

    return this.toInviteSummary(invite);
  }

  private toInviteSummary(invite: {
    id: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    createdAt: Date;
    expiresAt: Date;
    invitedByUser: { email: string };
  }): OrganizationInviteSummary {
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      invitedByEmail: invite.invitedByUser.email,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt.toISOString(),
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
