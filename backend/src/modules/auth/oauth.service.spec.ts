import { ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { OAuthService } from "./oauth.service";

describe("OAuthService — account linking", () => {
  const GITHUB_PROFILE = { id: 42, login: "octocat", email: "octo@example.com", avatar_url: "https://x/a.png", name: "Octo Cat" };

  function makePrisma(overrides: Record<string, unknown> = {}) {
    return {
      oAuthAccount: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: "user-1", passwordHash: "hash" }),
      },
      ...overrides,
    };
  }

  function makeConfig(): { get: jest.Mock } {
    return {
      get: jest.fn((key: string) => {
        if (key === "GITHUB_OAUTH_CLIENT_ID") return "client-id";
        if (key === "GITHUB_OAUTH_CLIENT_SECRET") return "client-secret";
        return undefined;
      }),
    };
  }

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("access_token")) {
        return Promise.resolve({ json: () => Promise.resolve({ access_token: "gh-token" }) });
      }
      if (url.includes("api.github.com/user")) {
        return Promise.resolve({ json: () => Promise.resolve(GITHUB_PROFILE) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    }) as unknown as typeof fetch;
  });

  it("links a new provider identity to the calling user", async () => {
    const prisma = makePrisma();
    const service = new OAuthService(prisma as never, {} as never, makeConfig() as never);

    await service.linkAccount("user-1", "github", "code", "https://app/callback");

    expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
      data: { userId: "user-1", provider: "github", providerUserId: "42" },
    });
  });

  it("is a no-op when the identity is already linked to the same user", async () => {
    const prisma = makePrisma({
      oAuthAccount: {
        findUnique: jest.fn().mockResolvedValue({ userId: "user-1" }),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
    });
    const service = new OAuthService(prisma as never, {} as never, makeConfig() as never);

    await expect(service.linkAccount("user-1", "github", "code", "https://app/callback")).resolves.toBeUndefined();
    expect(prisma.oAuthAccount.create).not.toHaveBeenCalled();
  });

  it("rejects linking an identity already claimed by a different user", async () => {
    const prisma = makePrisma({
      oAuthAccount: {
        findUnique: jest.fn().mockResolvedValue({ userId: "some-other-user" }),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
    });
    const service = new OAuthService(prisma as never, {} as never, makeConfig() as never);

    await expect(service.linkAccount("user-1", "github", "code", "https://app/callback")).rejects.toThrow(
      ConflictException,
    );
  });

  it("lists linked accounts for a user", async () => {
    const prisma = makePrisma({
      oAuthAccount: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ provider: "github", createdAt: new Date("2026-01-01") }]),
        deleteMany: jest.fn(),
      },
    });
    const service = new OAuthService(prisma as never, {} as never, makeConfig() as never);

    const result = await service.listLinkedAccounts("user-1");
    expect(result).toEqual([{ provider: "github", createdAt: new Date("2026-01-01").toISOString() }]);
  });

  it("unlinks a provider when the user has a password as a fallback", async () => {
    const prisma = makePrisma();
    const service = new OAuthService(prisma as never, {} as never, makeConfig() as never);

    await service.unlinkAccount("user-1", "github");
    expect(prisma.oAuthAccount.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1", provider: "github" } });
  });

  it("unlinks a provider when another provider is still connected", async () => {
    const prisma = makePrisma({
      user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", passwordHash: null }) },
      oAuthAccount: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ provider: "google" }]),
        deleteMany: jest.fn(),
      },
    });
    const service = new OAuthService(prisma as never, {} as never, makeConfig() as never);

    await expect(service.unlinkAccount("user-1", "github")).resolves.toBeUndefined();
  });

  it("refuses to unlink the only sign-in method (no password, no other provider)", async () => {
    const prisma = makePrisma({
      user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", passwordHash: null }) },
      oAuthAccount: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ provider: "github" }]),
        deleteMany: jest.fn(),
      },
    });
    const service = new OAuthService(prisma as never, {} as never, makeConfig() as never);

    await expect(service.unlinkAccount("user-1", "github")).rejects.toThrow(BadRequestException);
  });

  it("throws if the user no longer exists", async () => {
    const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(null) } });
    const service = new OAuthService(prisma as never, {} as never, makeConfig() as never);

    await expect(service.unlinkAccount("user-1", "github")).rejects.toThrow(UnauthorizedException);
  });
});
