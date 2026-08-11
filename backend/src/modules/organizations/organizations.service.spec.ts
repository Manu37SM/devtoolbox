import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";

function makePrisma(overrides: {
  organization?: Record<string, unknown>;
  organizationMember?: Record<string, unknown>;
  user?: Record<string, unknown>;
  aiUsageEvent?: Record<string, unknown>;
} = {}) {
  return {
    organization: {
      create: jest.fn(),
      findUnique: jest.fn(),
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
    user: {
      findUnique: jest.fn(),
      ...overrides.user,
    },
    aiUsageEvent: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
      ...overrides.aiUsageEvent,
    },
  };
}

describe("OrganizationsService", () => {
  describe("create", () => {
    it("creates an org with the caller as OWNER", async () => {
      const prisma = makePrisma({
        organization: {
          create: jest
            .fn()
            .mockResolvedValue({ id: "org-1", name: "Acme", createdAt: new Date("2026-01-01T00:00:00Z") }),
        },
      });
      const service = new OrganizationsService(prisma as never);

      const result = await service.create("user-1", { name: "Acme" });

      expect(result).toEqual({ id: "org-1", name: "Acme", role: "OWNER", createdAt: "2026-01-01T00:00:00.000Z" });
      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: { name: "Acme", members: { create: { userId: "user-1", role: "OWNER" } } },
      });
    });
  });

  describe("rename / delete — role gating", () => {
    it("rename throws ForbiddenException for a non-member", async () => {
      const prisma = makePrisma({ organizationMember: { findUnique: jest.fn().mockResolvedValue(null) } });
      const service = new OrganizationsService(prisma as never);

      await expect(service.rename("user-1", "org-1", { name: "New name" })).rejects.toThrow(ForbiddenException);
    });

    it("rename throws ForbiddenException for a MEMBER (not OWNER)", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "MEMBER" }) },
      });
      const service = new OrganizationsService(prisma as never);

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
      const service = new OrganizationsService(prisma as never);

      const result = await service.rename("user-1", "org-1", { name: "New name" });

      expect(result.name).toBe("New name");
    });

    it("delete throws ForbiddenException for an ADMIN (OWNER only)", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "ADMIN" }) },
      });
      const service = new OrganizationsService(prisma as never);

      await expect(service.delete("user-1", "org-1")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("addMember", () => {
    it("throws NotFoundException when no account exists for that email", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "OWNER" }) },
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = new OrganizationsService(prisma as never);

      await expect(service.addMember("user-1", "org-1", { email: "nobody@example.com" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ForbiddenException when the caller is only a MEMBER", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "MEMBER" }) },
      });
      const service = new OrganizationsService(prisma as never);

      await expect(service.addMember("user-1", "org-1", { email: "a@b.com" })).rejects.toThrow(ForbiddenException);
    });

    it("throws ConflictException when the target is already a member", async () => {
      const prisma = makePrisma({
        organizationMember: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ role: "OWNER" }) // caller's own membership (requireRole)
            .mockResolvedValueOnce({ userId: "user-2" }), // existing target membership
        },
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-2", email: "a@b.com", displayName: null }) },
      });
      const service = new OrganizationsService(prisma as never);

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
      const service = new OrganizationsService(prisma as never);

      const result = await service.addMember("user-1", "org-1", { email: "a@b.com" });

      expect(result).toEqual({
        userId: "user-2",
        email: "a@b.com",
        displayName: "Alice",
        role: "MEMBER",
        joinedAt: "2026-01-01T00:00:00.000Z",
      });
    });
  });

  describe("removeMember / updateMemberRole — last-OWNER protection", () => {
    it("removeMember throws ConflictException when removing the last OWNER", async () => {
      const prisma = makePrisma({
        organizationMember: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ role: "OWNER" }) // caller's own membership
            .mockResolvedValueOnce({ role: "OWNER" }), // target membership
          count: jest.fn().mockResolvedValue(1),
        },
      });
      const service = new OrganizationsService(prisma as never);

      await expect(service.removeMember("user-1", "org-1", "user-1")).rejects.toThrow(ConflictException);
    });

    it("removeMember allows a member to remove themself", async () => {
      const prisma = makePrisma({
        organizationMember: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ role: "MEMBER" }) // requireMembership for self-removal
            .mockResolvedValueOnce({ role: "MEMBER" }), // target membership
        },
      });
      const service = new OrganizationsService(prisma as never);

      await service.removeMember("user-1", "org-1", "user-1");

      expect(prisma.organizationMember.delete).toHaveBeenCalled();
    });

    it("updateMemberRole throws ConflictException when demoting the last OWNER", async () => {
      const prisma = makePrisma({
        organizationMember: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ role: "OWNER" }) // caller
            .mockResolvedValueOnce({ role: "OWNER" }), // target
          count: jest.fn().mockResolvedValue(1),
        },
      });
      const service = new OrganizationsService(prisma as never);

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
      const service = new OrganizationsService(prisma as never);

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
      const service = new OrganizationsService(prisma as never);

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
});
