import { ExecutionContext, HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PlanThrottleGuard } from "./plan-throttle.guard";
import { PLAN_THROTTLE_KEY, type PlanThrottleConfig } from "./plan-throttle.decorator";

const CONFIG: PlanThrottleConfig = {
  route: "test-route",
  anonymous: { limit: 2, ttlSeconds: 60 },
  free: { limit: 5, ttlSeconds: 60 },
  pro: { limit: 10, ttlSeconds: 60 },
};

function makeContext(opts: { user?: { userId: string }; metadata?: PlanThrottleConfig | undefined }) {
  const req: Record<string, unknown> = { ip: "203.0.113.1", headers: {}, socket: {} };
  if (opts.user) req.user = opts.user;
  const res = { setHeader: jest.fn() };

  return {
    context: {
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext,
    res,
  };
}

function makeReflector(metadata: PlanThrottleConfig | undefined): Reflector {
  return { get: (key: string) => (key === PLAN_THROTTLE_KEY ? metadata : undefined) } as unknown as Reflector;
}

function makeRedis(initialCounts: Record<string, number> = {}) {
  const counts = new Map<string, number>(Object.entries(initialCounts));
  return {
    incr: jest.fn(async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    }),
    expire: jest.fn(async () => 1),
    ttl: jest.fn(async () => 42),
  };
}

describe("PlanThrottleGuard", () => {
  it("allows the request through when the route has no @PlanThrottle metadata", async () => {
    const redis = makeRedis();
    const prisma = { user: { findUnique: jest.fn() } };
    const guard = new PlanThrottleGuard(makeReflector(undefined), prisma as never, redis as never);
    const { context } = makeContext({ metadata: undefined });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(redis.incr).not.toHaveBeenCalled();
  });

  it("uses the anonymous tier and IP-based key when there's no authenticated user", async () => {
    const redis = makeRedis();
    const prisma = { user: { findUnique: jest.fn() } };
    const guard = new PlanThrottleGuard(makeReflector(CONFIG), prisma as never, redis as never);
    const { context } = makeContext({});

    await guard.canActivate(context);

    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining("anonymous:203.0.113.1"));
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("looks up the user's plan and uses the free tier for a FREE-plan user", async () => {
    const redis = makeRedis();
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ plan: "FREE" }) } };
    const guard = new PlanThrottleGuard(makeReflector(CONFIG), prisma as never, redis as never);
    const { context } = makeContext({ user: { userId: "user-1" } });

    await guard.canActivate(context);

    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining("free:user-1"));
  });

  it("uses the pro tier for PRO and TEAM plans", async () => {
    const redis = makeRedis();
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ plan: "TEAM" }) } };
    const guard = new PlanThrottleGuard(makeReflector(CONFIG), prisma as never, redis as never);
    const { context } = makeContext({ user: { userId: "user-2" } });

    await guard.canActivate(context);

    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining("pro:user-2"));
  });

  it("throws a 429 once the tier's limit is exceeded, with Retry-After/X-RateLimit-Remaining headers", async () => {
    // anonymous limit is 2 — pre-seed the counter at 2 so the 3rd request trips it.
    const redis = makeRedis({ "ratelimit:test-route:anonymous:203.0.113.1": 2 });
    const prisma = { user: { findUnique: jest.fn() } };
    const guard = new PlanThrottleGuard(makeReflector(CONFIG), prisma as never, redis as never);
    const { context, res } = makeContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String));
  });

  it("does not throw for requests at or under the limit", async () => {
    const redis = makeRedis({ "ratelimit:test-route:anonymous:203.0.113.1": 1 });
    const prisma = { user: { findUnique: jest.fn() } };
    const guard = new PlanThrottleGuard(makeReflector(CONFIG), prisma as never, redis as never);
    const { context } = makeContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
