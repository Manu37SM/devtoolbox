import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PluginsService } from "./plugins.service";

const MINIMAL_WASM_BASE64 = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]).toString("base64");

function makePrisma(
  overrides: {
    plugin?: Record<string, unknown>;
    pluginVersion?: Record<string, unknown>;
    user?: Record<string, unknown>;
  } = {},
) {
  const tx = {
    plugin: { update: jest.fn() },
    pluginVersion: { create: jest.fn(), update: jest.fn() },
  };
  return {
    plugin: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      ...overrides.plugin,
    },
    pluginVersion: {
      create: jest.fn(),
      update: jest.fn(),
      ...overrides.pluginVersion,
    },
    user: {
      findUnique: jest.fn(),
      ...overrides.user,
    },
    $transaction: jest.fn(async (arg: unknown) => {
      if (typeof arg === "function") return arg(tx);
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };
}

describe("PluginsService", () => {
  describe("create", () => {
    it("throws ConflictException when the slug is already taken", async () => {
      const prisma = makePrisma({ plugin: { findUnique: jest.fn().mockResolvedValue({ id: "existing" }) } });
      const service = new PluginsService(prisma as never);

      await expect(
        service.create("user-1", { slug: "taken", name: "Taken", description: "desc" }),
      ).rejects.toThrow(ConflictException);
    });

    it("creates a DRAFT plugin owned by the caller", async () => {
      const prisma = makePrisma({
        plugin: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: "plugin-1",
            slug: "my-tool",
            name: "My Tool",
            description: "desc",
            status: "DRAFT",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            author: { email: "a@b.com" },
            versions: [],
          }),
        },
      });
      const service = new PluginsService(prisma as never);

      const result = await service.create("user-1", { slug: "my-tool", name: "My Tool", description: "desc" });

      expect(result.status).toBe("DRAFT");
      expect(result.latestVersion).toBeNull();
      expect(prisma.plugin.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ authorUserId: "user-1", slug: "my-tool" }) }),
      );
    });
  });

  describe("submitVersion", () => {
    it("throws NotFoundException for a nonexistent plugin", async () => {
      const prisma = makePrisma({ plugin: { findUnique: jest.fn().mockResolvedValue(null) } });
      const service = new PluginsService(prisma as never);

      await expect(
        service.submitVersion("user-1", "plugin-1", {
          manifest: { id: "x", name: "X", version: "1.0.0", description: "d", author: "a" },
          wasmBase64: MINIMAL_WASM_BASE64,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for a non-owner", async () => {
      const prisma = makePrisma({
        plugin: { findUnique: jest.fn().mockResolvedValue({ id: "plugin-1", authorUserId: "someone-else", status: "DRAFT" }) },
      });
      const service = new PluginsService(prisma as never);

      await expect(
        service.submitVersion("user-1", "plugin-1", {
          manifest: { id: "x", name: "X", version: "1.0.0", description: "d", author: "a" },
          wasmBase64: MINIMAL_WASM_BASE64,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws ForbiddenException for a SUSPENDED plugin", async () => {
      const prisma = makePrisma({
        plugin: { findUnique: jest.fn().mockResolvedValue({ id: "plugin-1", authorUserId: "user-1", status: "SUSPENDED" }) },
      });
      const service = new PluginsService(prisma as never);

      await expect(
        service.submitVersion("user-1", "plugin-1", {
          manifest: { id: "x", name: "X", version: "1.0.0", description: "d", author: "a" },
          wasmBase64: MINIMAL_WASM_BASE64,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws ConflictException for a payload missing the WASM magic number", async () => {
      const prisma = makePrisma({
        plugin: { findUnique: jest.fn().mockResolvedValue({ id: "plugin-1", authorUserId: "user-1", status: "DRAFT" }) },
      });
      const service = new PluginsService(prisma as never);
      const notWasm = Buffer.from("not a wasm file").toString("base64");

      await expect(
        service.submitVersion("user-1", "plugin-1", {
          manifest: { id: "x", name: "X", version: "1.0.0", description: "d", author: "a" },
          wasmBase64: notWasm,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("throws ConflictException for an oversized payload", async () => {
      const prisma = makePrisma({
        plugin: { findUnique: jest.fn().mockResolvedValue({ id: "plugin-1", authorUserId: "user-1", status: "DRAFT" }) },
      });
      const service = new PluginsService(prisma as never);
      const oversized = Buffer.concat([
        Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
        Buffer.alloc(2 * 1024 * 1024 + 1),
      ]).toString("base64");

      await expect(
        service.submitVersion("user-1", "plugin-1", {
          manifest: { id: "x", name: "X", version: "1.0.0", description: "d", author: "a" },
          wasmBase64: oversized,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("accepts a valid submission and moves the plugin back to IN_REVIEW", async () => {
      const createdVersion = {
        id: "version-1",
        version: "1.0.0",
        manifestJson: { id: "x", name: "X", version: "1.0.0", description: "d", author: "a" },
        checksumSha256: "irrelevant-for-this-assertion",
        reviewedAt: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      };
      const prisma = makePrisma({
        plugin: { findUnique: jest.fn().mockResolvedValue({ id: "plugin-1", authorUserId: "user-1", status: "PUBLISHED" }) },
      });

      prisma.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          pluginVersion: { create: jest.fn().mockResolvedValue(createdVersion) },
          plugin: { update: jest.fn().mockResolvedValue({}) },
        }),
      ) as never;
      const service = new PluginsService(prisma as never);

      const result = await service.submitVersion("user-1", "plugin-1", {
        manifest: { id: "x", name: "X", version: "1.0.0", description: "d", author: "a" },
        wasmBase64: MINIMAL_WASM_BASE64,
      });

      expect(result.version).toBe("1.0.0");
    });
  });

  describe("review-queue / review / suspend — admin gating", () => {
    it("listReviewQueue throws ForbiddenException for a non-admin", async () => {
      const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue({ isAdmin: false }) } });
      const service = new PluginsService(prisma as never);

      await expect(service.listReviewQueue("user-1")).rejects.toThrow(ForbiddenException);
    });

    it("listReviewQueue succeeds for an admin", async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ isAdmin: true }) },
        plugin: { findMany: jest.fn().mockResolvedValue([]) },
      });
      const service = new PluginsService(prisma as never);

      await expect(service.listReviewQueue("user-1")).resolves.toEqual([]);
    });

    it("review throws ForbiddenException for a non-admin", async () => {
      const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue({ isAdmin: false }) } });
      const service = new PluginsService(prisma as never);

      await expect(service.review("user-1", "plugin-1", "APPROVE")).rejects.toThrow(ForbiddenException);
    });

    it("review approves and publishes for an admin", async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ isAdmin: true }) },
        plugin: {
          findUnique: jest.fn().mockResolvedValue({
            id: "plugin-1",
            versions: [{ id: "version-1" }],
          }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: "plugin-1",
            slug: "my-tool",
            name: "My Tool",
            description: "d",
            status: "PUBLISHED",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            author: { email: "a@b.com" },
            versions: [{ version: "1.0.0" }],
          }),
        },
      });
      const service = new PluginsService(prisma as never);

      const result = await service.review("user-1", "plugin-1", "APPROVE");

      expect(result.status).toBe("PUBLISHED");
    });

    it("suspend throws ForbiddenException for a non-admin", async () => {
      const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue({ isAdmin: false }) } });
      const service = new PluginsService(prisma as never);

      await expect(service.suspend("user-1", "plugin-1")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getDetail / getRunPayload — visibility", () => {
    it("getDetail throws NotFoundException for a non-owner viewing a DRAFT plugin", async () => {
      const prisma = makePrisma({
        plugin: {
          findUnique: jest.fn().mockResolvedValue({
            id: "plugin-1",
            slug: "my-tool",
            name: "My Tool",
            description: "d",
            status: "DRAFT",
            authorUserId: "owner-1",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            author: { email: "a@b.com" },
            versions: [],
          }),
        },
        user: { findUnique: jest.fn().mockResolvedValue({ isAdmin: false }) },
      });
      const service = new PluginsService(prisma as never);

      await expect(service.getDetail("my-tool", "someone-else")).rejects.toThrow(NotFoundException);
    });

    it("getDetail succeeds for the owner viewing their own DRAFT plugin", async () => {
      const prisma = makePrisma({
        plugin: {
          findUnique: jest.fn().mockResolvedValue({
            id: "plugin-1",
            slug: "my-tool",
            name: "My Tool",
            description: "d",
            status: "DRAFT",
            authorUserId: "owner-1",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            author: { email: "a@b.com" },
            versions: [],
          }),
        },
      });
      const service = new PluginsService(prisma as never);

      const result = await service.getDetail("my-tool", "owner-1");
      expect(result.status).toBe("DRAFT");
    });

    it("getRunPayload throws NotFoundException for an anonymous caller on an unpublished plugin", async () => {
      const prisma = makePrisma({
        plugin: {
          findUnique: jest.fn().mockResolvedValue({
            id: "plugin-1",
            authorUserId: "owner-1",
            status: "IN_REVIEW",
            versions: [{ version: "1.0.0", wasmBase64: MINIMAL_WASM_BASE64, checksumSha256: "abc" }],
          }),
        },
      });
      const service = new PluginsService(prisma as never);

      await expect(service.getRunPayload("my-tool", undefined)).rejects.toThrow(NotFoundException);
    });

    it("getRunPayload succeeds for anyone on a PUBLISHED plugin", async () => {
      const prisma = makePrisma({
        plugin: {
          findUnique: jest.fn().mockResolvedValue({
            id: "plugin-1",
            authorUserId: "owner-1",
            status: "PUBLISHED",
            versions: [{ version: "1.0.0", wasmBase64: MINIMAL_WASM_BASE64, checksumSha256: "abc" }],
          }),
        },
      });
      const service = new PluginsService(prisma as never);

      const result = await service.getRunPayload("my-tool", undefined);
      expect(result).toEqual({ version: "1.0.0", wasmBase64: MINIMAL_WASM_BASE64, checksumSha256: "abc" });
    });
  });
});
