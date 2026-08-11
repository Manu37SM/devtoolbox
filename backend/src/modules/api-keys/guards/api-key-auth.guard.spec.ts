import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { ApiKeyAuthGuard } from "./api-key-auth.guard";
import type { ApiKeysService } from "../api-keys.service";

function makeContext(headers: Record<string, string> = {}) {
  const req: { headers: Record<string, string>; user?: unknown } = { headers };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe("ApiKeyAuthGuard", () => {
  it("throws UnauthorizedException when there's no Authorization header", async () => {
    const apiKeysService = { validateKey: jest.fn() };
    const guard = new ApiKeyAuthGuard(apiKeysService as unknown as ApiKeysService);
    const { ctx } = makeContext();

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(apiKeysService.validateKey).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedException for a non-Bearer Authorization header", async () => {
    const apiKeysService = { validateKey: jest.fn() };
    const guard = new ApiKeyAuthGuard(apiKeysService as unknown as ApiKeysService);
    const { ctx } = makeContext({ authorization: "Basic abc123" });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it("validates the bearer token and populates req.user on success", async () => {
    const apiKeysService = {
      validateKey: jest.fn().mockResolvedValue({ userId: "user-1", email: "a@b.com", plan: "PRO" }),
    };
    const guard = new ApiKeyAuthGuard(apiKeysService as unknown as ApiKeysService);
    const { ctx, req } = makeContext({ authorization: "Bearer dtb_live_abc123" });

    const allowed = await guard.canActivate(ctx);

    expect(allowed).toBe(true);
    expect(apiKeysService.validateKey).toHaveBeenCalledWith("dtb_live_abc123");
    expect(req.user).toEqual({ userId: "user-1", email: "a@b.com" });
  });

  it("propagates the service's rejection (e.g. revoked/wrong-plan key)", async () => {
    const apiKeysService = { validateKey: jest.fn().mockRejectedValue(new UnauthorizedException("nope")) };
    const guard = new ApiKeyAuthGuard(apiKeysService as unknown as ApiKeysService);
    const { ctx } = makeContext({ authorization: "Bearer dtb_live_bad" });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
