import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { MAX_FAILED_LOGIN_ATTEMPTS } from "./auth.constants";

jest.mock("argon2", () => ({
  verify: jest.fn((_hash: string, plain: string) => Promise.resolve(plain === "correct-password")),
  hash: jest.fn((plain: string) => Promise.resolve(`hashed:${plain}`)),
}));

describe("AuthService.login — account lockout", () => {
  const HASH = "argon2-hash-placeholder";

  function makeUser(overrides: Record<string, unknown> = {}) {
    return {
      id: "user-1",
      email: "a@example.com",
      passwordHash: HASH,
      displayName: null,
      avatarUrl: null,
      plan: "FREE",
      emailVerified: true,
      deletedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      ...overrides,
    };
  }

  function makePrisma(user: ReturnType<typeof makeUser> | null) {
    return {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...user, ...data })),
      },
      session: { create: jest.fn().mockResolvedValue({}) },
    };
  }

  function makeService(prisma: ReturnType<typeof makePrisma>) {
    const jwt = { sign: jest.fn().mockReturnValue("access-token") };
    const config = { getOrThrow: jest.fn().mockReturnValue("secret"), get: jest.fn() };
    const email = {};
    const securityLog = { record: jest.fn().mockResolvedValue(undefined) };
    return {
      service: new AuthService(prisma as never, jwt as never, config as never, email as never, securityLog as never),
      securityLog,
    };
  }

  it("rejects a wrong password without locking the account before the threshold", async () => {
    const user = makeUser({ failedLoginAttempts: 0 });
    const prisma = makePrisma(user);
    const { service, securityLog } = makeService(prisma);

    await expect(
      service.login({ email: user.email, password: "wrong" }, {}),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { failedLoginAttempts: 1, lockedUntil: null },
    });
    expect(securityLog.record).toHaveBeenCalledWith(expect.objectContaining({ type: "LOGIN_FAILED" }));
  });

  it("locks the account once failures reach the threshold", async () => {
    const user = makeUser({ failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS - 1 });
    const prisma = makePrisma(user);
    const { service, securityLog } = makeService(prisma);

    await expect(
      service.login({ email: user.email, password: "wrong" }, {}),
    ).rejects.toThrow(/temporarily locked/);

    const updateCall = prisma.user.update.mock.calls[0][0];
    expect(updateCall.data.lockedUntil).toBeInstanceOf(Date);
    expect(securityLog.record).toHaveBeenCalledWith(expect.objectContaining({ type: "ACCOUNT_LOCKED" }));
  });

  it("rejects a login attempt while the account is locked, even with the correct password", async () => {
    const user = makeUser({ lockedUntil: new Date(Date.now() + 60_000) });
    const prisma = makePrisma(user);
    const { service } = makeService(prisma);

    await expect(
      service.login({ email: user.email, password: "correct-password" }, {}),
    ).rejects.toThrow(/temporarily locked/);
  });

  it("allows login once the lock has expired, and resets the counter on success", async () => {
    const user = makeUser({ failedLoginAttempts: 3, lockedUntil: new Date(Date.now() - 60_000) });
    const prisma = makePrisma(user);
    const { service, securityLog } = makeService(prisma);

    const result = await service.login({ email: user.email, password: "correct-password" }, {});

    expect(result.tokens.accessToken).toBe("access-token");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    expect(securityLog.record).toHaveBeenCalledWith(expect.objectContaining({ type: "LOGIN_SUCCEEDED" }));
  });

  it("does not touch failedLoginAttempts on a normal successful login", async () => {
    const user = makeUser();
    const prisma = makePrisma(user);
    const { service } = makeService(prisma);

    await service.login({ email: user.email, password: "correct-password" }, {});

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
