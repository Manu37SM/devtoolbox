import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ApiKeysService } from "./api-keys.service";
import { hashToken } from "../../common/crypto/token-hash";

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    apiKey: {
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "key-1", createdAt: new Date("2026-01-01T00:00:00Z"), ...data }),
      ),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    organizationMember: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  };
}

describe("ApiKeysService", () => {
  it("createKey generates a raw key, stores only its hash, and returns the raw key once", async () => {
    const prisma = makePrisma();
    const service = new ApiKeysService(prisma as never);

    const result = await service.createKey("user-1", "CI pipeline");

    expect(result.key).toMatch(/^dtb_live_/);
    expect(result.key.startsWith(result.keyPrefix)).toBe(true);
    expect(result.keyPrefix.length).toBeLessThan(result.key.length);
    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        name: "CI pipeline",
        keyHash: hashToken(result.key),
      }),
    });

    const createCall = prisma.apiKey.create.mock.calls[0][0];
    expect(createCall.data).not.toHaveProperty("key");
  });

  it("listKeys maps rows to summaries without exposing keyHash", async () => {
    const prisma = makePrisma({
      apiKey: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "key-1",
            name: "CI",
            keyPrefix: "dtb_live_ab12",
            keyHash: "secret-hash",
            lastUsedAt: null,
            revokedAt: null,
            createdAt: new Date("2026-01-01T00:00:00Z"),
          },
        ]),
      },
    });
    const service = new ApiKeysService(prisma as never);

    const keys = await service.listKeys("user-1");

    expect(keys).toEqual([
      {
        id: "key-1",
        name: "CI",
        keyPrefix: "dtb_live_ab12",
        lastUsedAt: null,
        revokedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("revokeKey throws NotFoundException for a key belonging to a different user", async () => {
    const prisma = makePrisma({
      apiKey: { findUnique: jest.fn().mockResolvedValue({ id: "key-1", userId: "someone-else", revokedAt: null }) },
    });
    const service = new ApiKeysService(prisma as never);

    await expect(service.revokeKey("user-1", "key-1")).rejects.toThrow(NotFoundException);
  });

  it("revokeKey is idempotent for an already-revoked key", async () => {
    const prisma = makePrisma({
      apiKey: {
        findUnique: jest.fn().mockResolvedValue({ id: "key-1", userId: "user-1", revokedAt: new Date() }),
        update: jest.fn(),
      },
    });
    const service = new ApiKeysService(prisma as never);

    await service.revokeKey("user-1", "key-1");

    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it("revokeKey sets revokedAt for the owning user's active key", async () => {
    const prisma = makePrisma({
      apiKey: {
        findUnique: jest.fn().mockResolvedValue({ id: "key-1", userId: "user-1", revokedAt: null }),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    const service = new ApiKeysService(prisma as never);

    await service.revokeKey("user-1", "key-1");

    expect(prisma.apiKey.update).toHaveBeenCalledWith({ where: { id: "key-1" }, data: { revokedAt: expect.any(Date) } });
  });

  it("validateKey throws UnauthorizedException for an unknown key", async () => {
    const prisma = makePrisma({ apiKey: { findUnique: jest.fn().mockResolvedValue(null) } });
    const service = new ApiKeysService(prisma as never);

    await expect(service.validateKey("dtb_live_bogus")).rejects.toThrow(UnauthorizedException);
  });

  it("validateKey throws UnauthorizedException for a revoked key", async () => {
    const prisma = makePrisma({
      apiKey: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "key-1", revokedAt: new Date(), user: { id: "user-1", email: "a@b.com", plan: "PRO" } }),
      },
    });
    const service = new ApiKeysService(prisma as never);

    await expect(service.validateKey("dtb_live_x")).rejects.toThrow(UnauthorizedException);
  });

  it("validateKey throws ForbiddenException for a FREE-plan owner", async () => {
    const prisma = makePrisma({
      apiKey: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "key-1", revokedAt: null, user: { id: "user-1", email: "a@b.com", plan: "FREE" } }),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    const service = new ApiKeysService(prisma as never);

    await expect(service.validateKey("dtb_live_x")).rejects.toThrow(ForbiddenException);
  });

  it("validateKey allows a FREE-plan key owner who belongs to a TEAM-owner's organization", async () => {
    const prisma = makePrisma({
      apiKey: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "key-1", revokedAt: null, user: { id: "user-1", email: "a@b.com", plan: "FREE" } }),
        update: jest.fn().mockResolvedValue({}),
      },
      organizationMember: { findFirst: jest.fn().mockResolvedValue({ id: "membership-1" }) },
    });
    const service = new ApiKeysService(prisma as never);

    const principal = await service.validateKey("dtb_live_x");

    expect(principal).toEqual({ userId: "user-1", email: "a@b.com", plan: "TEAM" });
  });

  it("validateKey returns the principal and bumps lastUsedAt for a valid PRO-plan key", async () => {
    const prisma = makePrisma({
      apiKey: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "key-1", revokedAt: null, user: { id: "user-1", email: "a@b.com", plan: "PRO" } }),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    const service = new ApiKeysService(prisma as never);

    const principal = await service.validateKey("dtb_live_x");

    expect(principal).toEqual({ userId: "user-1", email: "a@b.com", plan: "PRO" });
    expect(prisma.apiKey.update).toHaveBeenCalledWith({ where: { id: "key-1" }, data: { lastUsedAt: expect.any(Date) } });
  });
});
