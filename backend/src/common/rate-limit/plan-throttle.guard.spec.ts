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

  it("looks up the user's plan and uses the free tier for a FREE-plan user with no TEAM org", async () => {
    const redis = makeRedis();
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ plan: "FREE" }) },
      organizationMember: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const guard = new PlanThrottleGuard(makeReflector(CONFIG), prisma as never, redis as never);
    const { context } = makeContext({ user: { userId: "user-1" } });

    await guard.canActivate(context);

    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining("free:user-1"));
  });

  it("uses the pro tier for PRO and TEAM plans", async () => {
    const redis = makeRedis();
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ plan: "TEAM" }) },
      organizationMember: { findFirst: jest.fn() },
    };
    const guard = new PlanThrottleGuard(makeReflector(CONFIG), prisma as never, redis as never);
    const { context } = makeContext({ user: { userId: "user-2" } });

    await guard.canActivate(context);

    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining("pro:user-2"));

    expect(prisma.organizationMember.findFirst).not.toHaveBeenCalled();
  });

  it("uses the pro tier for a FREE-plan user who belongs to a TEAM-owner's organization", async () => {
    const redis = makeRedis();
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ plan: "FREE" }) },
      organizationMember: { findFirst: jest.fn().mockResolvedValue({ id: "membership-1" }) },
    };
    const guard = new PlanThrottleGuard(makeReflector(CONFIG), prisma as never, redis as never);
    const { context } = makeContext({ user: { userId: "user-3" } });

    await guard.canActivate(context);

    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining("pro:user-3"));
  });

  it("throws a 429 once the tier's limit is exceeded, with Retry-After/X-RateLimit-Remaining headers", async () => {

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

describe("PlanThrottleGuard launch promo", () => {
  const AI_CONFIG: PlanThrottleConfig = { ...CONFIG, route: "ai-explain" };
  const original = process.env.LAUNCH_PROMO_UNTIL;
  afterEach(() => {
    if (original === undefined) delete process.env.LAUNCH_PROMO_UNTIL;
    else process.env.LAUNCH_PROMO_UNTIL = original;
  });

  function freeUserGuard(config: PlanThrottleConfig) {
    const redis = makeRedis();
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ plan: "FREE" }) },
      organizationMember: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    return { redis, guard: new PlanThrottleGuard(makeReflector(config), prisma as never, redis as never) };
  }

  it("gives signed-in FREE users the pro tier on AI routes while the promo is active", async () => {
    process.env.LAUNCH_PROMO_UNTIL = "2999-01-01T00:00:00Z";
    const { redis, guard } = freeUserGuard(AI_CONFIG);
    await guard.canActivate(makeContext({ user: { userId: "u1" } }).context);
    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining("pro:u1"));
  });

  it("does not apply to non-AI routes", async () => {
    process.env.LAUNCH_PROMO_UNTIL = "2999-01-01T00:00:00Z";
    const { redis, guard } = freeUserGuard(CONFIG);
    await guard.canActivate(makeContext({ user: { userId: "u1" } }).context);
    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining("free:u1"));
  });

  it("does not upgrade anonymous callers", async () => {
    process.env.LAUNCH_PROMO_UNTIL = "2999-01-01T00:00:00Z";
    const { redis, guard } = freeUserGuard(AI_CONFIG);
    await guard.canActivate(makeContext({}).context);
    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining("anonymous:"));
  });

  it("is off once the date has passed", async () => {
    process.env.LAUNCH_PROMO_UNTIL = "2000-01-01T00:00:00Z";
    const { redis, guard } = freeUserGuard(AI_CONFIG);
    await guard.canActivate(makeContext({ user: { userId: "u1" } }).context);
    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining("free:u1"));
  });
});
