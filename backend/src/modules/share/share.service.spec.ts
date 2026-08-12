import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ShareService } from "./share.service";

function makePrisma(overrides: {
  shareLink?: Record<string, unknown>;
  organizationMember?: Record<string, unknown>;
} = {}) {
  return {
    shareLink: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
      ...overrides.shareLink,
    },
    organizationMember: {
      findUnique: jest.fn().mockResolvedValue(null),
      ...overrides.organizationMember,
    },
  };
}

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = { FRONTEND_URL: "https://devtoolbox.dev", ...overrides };
  return { get: jest.fn((key: string) => values[key]) };
}

describe("ShareService", () => {
  describe("create", () => {
    it("throws BadRequestException when the payload is too large", async () => {
      const prisma = makePrisma();
      const service = new ShareService(prisma as never, makeConfig() as never);
      const bigPayload = { text: "x".repeat(250_000) };

      await expect(service.create("user-1", { toolSlug: "json-formatter", payload: bigPayload })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("creates an anonymous share link with no organizationId", async () => {
      const prisma = makePrisma({
        shareLink: {
          create: jest.fn().mockResolvedValue({
            slug: "abc123",
            expiresAt: new Date("2026-09-01T00:00:00Z"),
          }),
        },
      });
      const service = new ShareService(prisma as never, makeConfig() as never);

      const result = await service.create(undefined, { toolSlug: "json-formatter", payload: { a: 1 } });

      expect(prisma.shareLink.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: null, organizationId: null }) }),
      );
      expect(result).toEqual({
        slug: "abc123",
        url: "https://devtoolbox.dev/s/abc123",
        expiresAt: "2026-09-01T00:00:00.000Z",
      });
    });

    it("throws ForbiddenException when an anonymous caller tries to attach an organizationId", async () => {
      const prisma = makePrisma();
      const service = new ShareService(prisma as never, makeConfig() as never);

      await expect(
        service.create(undefined, { toolSlug: "json-formatter", payload: {}, organizationId: "org-1" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws ForbiddenException when the caller isn't a member of the given org", async () => {
      const prisma = makePrisma({ organizationMember: { findUnique: jest.fn().mockResolvedValue(null) } });
      const service = new ShareService(prisma as never, makeConfig() as never);

      await expect(
        service.create("user-1", { toolSlug: "json-formatter", payload: {}, organizationId: "org-1" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("attaches organizationId when the caller is a member", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "MEMBER" }) },
        shareLink: {
          create: jest.fn().mockResolvedValue({ slug: "org123", expiresAt: new Date("2026-09-01T00:00:00Z") }),
        },
      });
      const service = new ShareService(prisma as never, makeConfig() as never);

      await service.create("user-1", { toolSlug: "json-formatter", payload: {}, organizationId: "org-1" });

      expect(prisma.shareLink.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ organizationId: "org-1" }) }),
      );
    });
  });

  describe("resolve", () => {
    it("throws NotFoundException for a missing slug", async () => {
      const prisma = makePrisma({ shareLink: { findUnique: jest.fn().mockResolvedValue(null) } });
      const service = new ShareService(prisma as never, makeConfig() as never);

      await expect(service.resolve("nope")).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException for an expired link", async () => {
      const prisma = makePrisma({
        shareLink: {
          findUnique: jest.fn().mockResolvedValue({
            id: "link-1",
            toolSlug: "json-formatter",
            payload: {},
            createdAt: new Date(),
            expiresAt: new Date("2020-01-01T00:00:00Z"),
            organization: null,
          }),
        },
      });
      const service = new ShareService(prisma as never, makeConfig() as never);

      await expect(service.resolve("expired-slug")).rejects.toThrow(NotFoundException);
    });

    it("returns branding: null when the link has no org", async () => {
      const prisma = makePrisma({
        shareLink: {
          findUnique: jest.fn().mockResolvedValue({
            id: "link-1",
            toolSlug: "json-formatter",
            payload: { a: 1 },
            createdAt: new Date("2026-01-01T00:00:00Z"),
            expiresAt: null,
            organization: null,
          }),
        },
      });
      const service = new ShareService(prisma as never, makeConfig() as never);

      const result = await service.resolve("slug-1");

      expect(result.branding).toBeNull();
      expect(prisma.shareLink.update).toHaveBeenCalledWith({
        where: { id: "link-1" },
        data: { viewCount: { increment: 1 } },
      });
    });

    it("returns branding when the org has a brandName set", async () => {
      const prisma = makePrisma({
        shareLink: {
          findUnique: jest.fn().mockResolvedValue({
            id: "link-1",
            toolSlug: "json-formatter",
            payload: { a: 1 },
            createdAt: new Date("2026-01-01T00:00:00Z"),
            expiresAt: null,
            organization: { brandName: "Acme", brandLogoUrl: "https://acme.example.com/logo.png" },
          }),
        },
      });
      const service = new ShareService(prisma as never, makeConfig() as never);

      const result = await service.resolve("slug-1");

      expect(result.branding).toEqual({ name: "Acme", logoUrl: "https://acme.example.com/logo.png" });
    });

    it("falls back to no branding when the org exists but has no brandName", async () => {
      const prisma = makePrisma({
        shareLink: {
          findUnique: jest.fn().mockResolvedValue({
            id: "link-1",
            toolSlug: "json-formatter",
            payload: {},
            createdAt: new Date("2026-01-01T00:00:00Z"),
            expiresAt: null,
            organization: { brandName: null, brandLogoUrl: null },
          }),
        },
      });
      const service = new ShareService(prisma as never, makeConfig() as never);

      const result = await service.resolve("slug-1");

      expect(result.branding).toBeNull();
    });
  });

  describe("remove", () => {
    it("throws NotFoundException for a missing slug", async () => {
      const prisma = makePrisma({ shareLink: { findUnique: jest.fn().mockResolvedValue(null) } });
      const service = new ShareService(prisma as never, makeConfig() as never);

      await expect(service.remove("user-1", "nope")).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when the caller doesn't own the link", async () => {
      const prisma = makePrisma({
        shareLink: { findUnique: jest.fn().mockResolvedValue({ id: "link-1", userId: "someone-else" }) },
      });
      const service = new ShareService(prisma as never, makeConfig() as never);

      await expect(service.remove("user-1", "slug-1")).rejects.toThrow(ForbiddenException);
    });

    it("deletes the link when the caller owns it", async () => {
      const prisma = makePrisma({
        shareLink: { findUnique: jest.fn().mockResolvedValue({ id: "link-1", userId: "user-1" }) },
      });
      const service = new ShareService(prisma as never, makeConfig() as never);

      await service.remove("user-1", "slug-1");

      expect(prisma.shareLink.delete).toHaveBeenCalledWith({ where: { id: "link-1" } });
    });
  });
});
