import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";

function makePrisma(overrides: {
  organization?: Record<string, unknown>;
  organizationMember?: Record<string, unknown>;
  organizationInvite?: Record<string, unknown>;
  user?: Record<string, unknown>;
  aiUsageEvent?: Record<string, unknown>;
} = {}) {
  return {
    organization: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ...overrides.organization,
    },
    organizationMember: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      ...overrides.organizationMember,
    },
    organizationInvite: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      ...overrides.organizationInvite,
    },
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      ...overrides.user,
    },
    aiUsageEvent: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
      ...overrides.aiUsageEvent,
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
}

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = { FRONTEND_URL: "https://devtoolbox.dev", ...overrides };
  return { get: jest.fn((key: string) => values[key]) };
}

function makeEmail() {
  return { sendOrgInviteEmail: jest.fn().mockResolvedValue(undefined) };
}

describe("OrganizationsService", () => {
  describe("create", () => {
    it("creates an org with the caller as OWNER", async () => {
      const prisma = makePrisma({
        organization: {
          create: jest.fn().mockResolvedValue({
            id: "org-1",
            name: "Acme",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            brandName: null,
            brandLogoUrl: null,
          }),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      const result = await service.create("user-1", { name: "Acme" });

      expect(result).toEqual({
        id: "org-1",
        name: "Acme",
        role: "OWNER",
        createdAt: "2026-01-01T00:00:00.000Z",
        brandName: null,
        brandLogoUrl: null,
      });
      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: { name: "Acme", members: { create: { userId: "user-1", role: "OWNER" } } },
      });
    });
  });

  describe("rename / delete — role gating", () => {
    it("rename throws ForbiddenException for a non-member", async () => {
      const prisma = makePrisma({ organizationMember: { findUnique: jest.fn().mockResolvedValue(null) } });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.rename("user-1", "org-1", { name: "New name" })).rejects.toThrow(ForbiddenException);
    });

    it("rename throws ForbiddenException for a MEMBER (not OWNER)", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "MEMBER" }) },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.rename("user-1", "org-1", { name: "New name" })).rejects.toThrow(ForbiddenException);
    });

    it("rename succeeds for an OWNER", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "OWNER" }) },
        organization: {
          update: jest
            .fn()
            .mockResolvedValue({ id: "org-1", name: "New name", createdAt: new Date("2026-01-01T00:00:00Z") }),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      const result = await service.rename("user-1", "org-1", { name: "New name" });

      expect(result.name).toBe("New name");
    });

    it("delete throws ForbiddenException for an ADMIN (OWNER only)", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "ADMIN" }) },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.delete("user-1", "org-1")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("addMember", () => {
    it("creates a pending invite and emails it when no account exists for that email", async () => {
      const email = makeEmail();
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "OWNER" }) },
        user: { findUnique: jest.fn().mockResolvedValue(null) },
        organization: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "org-1", name: "Acme" }),
        },
        organizationInvite: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: "invite-1",
            email: "nobody@example.com",
            role: "MEMBER",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            expiresAt: new Date("2026-01-08T00:00:00Z"),
            invitedByUser: { email: "owner@acme.com" },
          }),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, email as never);

      const result = await service.addMember("user-1", "org-1", { email: "nobody@example.com" });

      expect(result.status).toBe("invited");
      expect(email.sendOrgInviteEmail).toHaveBeenCalledWith(
        "nobody@example.com",
        "Acme",
        expect.stringContaining("https://devtoolbox.dev/invites/"),
      );
    });

    it("throws ForbiddenException when the caller is only a MEMBER", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "MEMBER" }) },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.addMember("user-1", "org-1", { email: "a@b.com" })).rejects.toThrow(ForbiddenException);
    });

    it("throws ConflictException when the target is already a member", async () => {
      const prisma = makePrisma({
        organizationMember: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ role: "OWNER" })
            .mockResolvedValueOnce({ userId: "user-2" }),
        },
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-2", email: "a@b.com", displayName: null }) },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.addMember("user-1", "org-1", { email: "a@b.com" })).rejects.toThrow(ConflictException);
    });

    it("adds an existing user as MEMBER", async () => {
      const prisma = makePrisma({
        organizationMember: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ role: "OWNER" })
            .mockResolvedValueOnce(null),
          create: jest
            .fn()
            .mockResolvedValue({ role: "MEMBER", joinedAt: new Date("2026-01-01T00:00:00Z") }),
        },
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-2", email: "a@b.com", displayName: "Alice" }) },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      const result = await service.addMember("user-1", "org-1", { email: "a@b.com" });

      expect(result).toEqual({
        status: "added",
        member: {
          userId: "user-2",
          email: "a@b.com",
          displayName: "Alice",
          role: "MEMBER",
          joinedAt: "2026-01-01T00:00:00.000Z",
        },
      });
    });
  });

  describe("removeMember / updateMemberRole — last-OWNER protection", () => {
    it("removeMember throws ConflictException when removing the last OWNER", async () => {
      const prisma = makePrisma({
        organizationMember: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ role: "OWNER" })
            .mockResolvedValueOnce({ role: "OWNER" }),
          count: jest.fn().mockResolvedValue(1),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.removeMember("user-1", "org-1", "user-1")).rejects.toThrow(ConflictException);
    });

    it("removeMember allows a member to remove themself", async () => {
      const prisma = makePrisma({
        organizationMember: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ role: "MEMBER" })
            .mockResolvedValueOnce({ role: "MEMBER" }),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await service.removeMember("user-1", "org-1", "user-1");

      expect(prisma.organizationMember.delete).toHaveBeenCalled();
    });

    it("updateMemberRole throws ConflictException when demoting the last OWNER", async () => {
      const prisma = makePrisma({
        organizationMember: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ role: "OWNER" })
            .mockResolvedValueOnce({ role: "OWNER" }),
          count: jest.fn().mockResolvedValue(1),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.updateMemberRole("user-1", "org-1", "user-1", { role: "MEMBER" })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("getUsage", () => {
    it("throws ForbiddenException for a plain MEMBER", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "MEMBER" }) },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.getUsage("user-1", "org-1")).rejects.toThrow(ForbiddenException);
    });

    it("aggregates AiUsageEvent rows per member for an OWNER", async () => {
      const prisma = makePrisma({
        organizationMember: {
          findUnique: jest.fn().mockResolvedValue({ role: "OWNER" }),
          findMany: jest.fn().mockResolvedValue([
            { userId: "user-1", user: { id: "user-1", email: "a@b.com" } },
            { userId: "user-2", user: { id: "user-2", email: "c@d.com" } },
          ]),
        },
        aiUsageEvent: {
          groupBy: jest.fn().mockResolvedValue([
            { userId: "user-1", _count: { _all: 2 }, _sum: { inputTokens: 120, outputTokens: 60 } },
            { userId: "user-2", _count: { _all: 1 }, _sum: { inputTokens: 5, outputTokens: 5 } },
          ]),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      const usage = await service.getUsage("user-1", "org-1");

      expect(usage.totalRequests).toBe(3);
      expect(usage.totalInputTokens).toBe(125);
      expect(usage.totalOutputTokens).toBe(65);
      expect(usage.byMember).toEqual([
        { userId: "user-1", email: "a@b.com", requests: 2, inputTokens: 120, outputTokens: 60 },
        { userId: "user-2", email: "c@d.com", requests: 1, inputTokens: 5, outputTokens: 5 },
      ]);
    });
  });

  describe("invites", () => {
    it("listInvites throws ForbiddenException for a plain MEMBER", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "MEMBER" }) },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.listInvites("user-1", "org-1")).rejects.toThrow(ForbiddenException);
    });

    it("listInvites maps pending invite rows for an OWNER", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "OWNER" }) },
        organizationInvite: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "invite-1",
              email: "nobody@example.com",
              role: "MEMBER",
              createdAt: new Date("2026-01-01T00:00:00Z"),
              expiresAt: new Date("2026-01-08T00:00:00Z"),
              invitedByUser: { email: "owner@acme.com" },
            },
          ]),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      const invites = await service.listInvites("user-1", "org-1");

      expect(invites).toEqual([
        {
          id: "invite-1",
          email: "nobody@example.com",
          role: "MEMBER",
          invitedByEmail: "owner@acme.com",
          createdAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2026-01-08T00:00:00.000Z",
        },
      ]);
    });

    it("revokeInvite throws NotFoundException for an invite from a different org", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "OWNER" }) },
        organizationInvite: {
          findUnique: jest.fn().mockResolvedValue({ id: "invite-1", organizationId: "org-other", acceptedAt: null, revokedAt: null }),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.revokeInvite("user-1", "org-1", "invite-1")).rejects.toThrow(NotFoundException);
    });

    it("revokeInvite throws ConflictException for an already-accepted invite", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "OWNER" }) },
        organizationInvite: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: "invite-1", organizationId: "org-1", acceptedAt: new Date(), revokedAt: null }),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.revokeInvite("user-1", "org-1", "invite-1")).rejects.toThrow(ConflictException);
    });

    it("revokeInvite marks a pending invite revoked", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "OWNER" }) },
        organizationInvite: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: "invite-1", organizationId: "org-1", acceptedAt: null, revokedAt: null }),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await service.revokeInvite("user-1", "org-1", "invite-1");

      expect(prisma.organizationInvite.update).toHaveBeenCalledWith({
        where: { id: "invite-1" },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("acceptInvite throws UnauthorizedException for an expired invite", async () => {
      const prisma = makePrisma({
        organizationInvite: {
          findUnique: jest.fn().mockResolvedValue({
            id: "invite-1",
            organizationId: "org-1",
            email: "a@b.com",
            role: "MEMBER",
            acceptedAt: null,
            revokedAt: null,
            expiresAt: new Date("2020-01-01T00:00:00Z"),
            organization: { name: "Acme" },
          }),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.acceptInvite("user-1", "raw-token")).rejects.toThrow();
    });

    it("acceptInvite throws ForbiddenException when the caller's email doesn't match the invite", async () => {
      const prisma = makePrisma({
        organizationInvite: {
          findUnique: jest.fn().mockResolvedValue({
            id: "invite-1",
            organizationId: "org-1",
            email: "invited@example.com",
            role: "MEMBER",
            acceptedAt: null,
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            organization: { name: "Acme" },
          }),
        },
        user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", email: "someone-else@example.com" }) },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(service.acceptInvite("user-1", "raw-token")).rejects.toThrow(ForbiddenException);
    });

    it("acceptInvite creates the membership and marks the invite accepted on success", async () => {
      const prisma = makePrisma({
        organizationInvite: {
          findUnique: jest.fn().mockResolvedValue({
            id: "invite-1",
            organizationId: "org-1",
            email: "a@b.com",
            role: "MEMBER",
            acceptedAt: null,
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            organization: { name: "Acme" },
          }),
        },
        user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.com" }) },
        organizationMember: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      const result = await service.acceptInvite("user-1", "raw-token");

      expect(result).toEqual({ organizationId: "org-1", organizationName: "Acme", role: "MEMBER" });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("updateBranding", () => {
    it("throws ForbiddenException for a non-OWNER", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "ADMIN" }) },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await expect(
        service.updateBranding("user-1", "org-1", { brandName: "Acme" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("updates brandName/brandLogoUrl for an OWNER", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "OWNER" }) },
        organization: {
          update: jest.fn().mockResolvedValue({
            id: "org-1",
            name: "Acme",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            brandName: "Acme Platform Team",
            brandLogoUrl: "https://acme.example.com/logo.png",
          }),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      const result = await service.updateBranding("user-1", "org-1", {
        brandName: "Acme Platform Team",
        brandLogoUrl: "https://acme.example.com/logo.png",
      });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: { brandName: "Acme Platform Team", brandLogoUrl: "https://acme.example.com/logo.png" },
      });
      expect(result.brandName).toBe("Acme Platform Team");
      expect(result.brandLogoUrl).toBe("https://acme.example.com/logo.png");
    });

    it("clears a field when explicitly passed null, and leaves it untouched when omitted", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "OWNER" }) },
        organization: {
          update: jest.fn().mockResolvedValue({
            id: "org-1",
            name: "Acme",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            brandName: null,
            brandLogoUrl: "https://acme.example.com/logo.png",
          }),
        },
      });
      const service = new OrganizationsService(prisma as never, makeConfig() as never, makeEmail() as never);

      await service.updateBranding("user-1", "org-1", { brandName: null });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: { brandName: null },
      });
    });
  });
});
