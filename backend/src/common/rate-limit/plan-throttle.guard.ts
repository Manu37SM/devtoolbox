import { CanActivate, ExecutionContext, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type Redis from "ioredis";
import type { Request, Response } from "express";
import { REDIS_CLIENT } from "../redis/redis.module";
import { PrismaService } from "../../database/prisma.service";
import { PLAN_THROTTLE_KEY, type PlanThrottleConfig } from "./plan-throttle.decorator";
import type { AuthenticatedUser } from "../../modules/auth/decorators/current-user.decorator";

/**
 * Fixed-window rate limiter keyed by (route, identity), where identity is
 * the authenticated user's id or, anonymously, their IP — and the limit
 * itself depends on the caller's plan. Implemented directly against Redis
 * (`INCR`+`EXPIRE`) rather than extending `@nestjs/throttler`'s
 * `ThrottlerGuard`: that class's per-tracker/per-throttler internals
 * aren't designed for "the limit itself varies per request," only for a
 * fixed limit per route, and fighting that abstraction seemed more
 * fragile than a small self-contained implementation against
 * infrastructure (Redis) this codebase already depends on for exactly
 * this kind of ephemeral counter (see NetModule's webhook inbox).
 *
 * Routes using this guard should NOT also carry `@Throttle(...)` — this
 * guard is the rate limit for them. The global `ThrottlerGuard` (see
 * AppModule's `APP_GUARD`) still applies everywhere as a coarse baseline.
 */
@Injectable()
export class PlanThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<PlanThrottleConfig | undefined>(PLAN_THROTTLE_KEY, context.getHandler());
    if (!config) return true; // no @PlanThrottle on this route — nothing to enforce here

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const res = context.switchToHttp().getResponse<Response>();

    const { tier, identity } = await this.resolveTierAndIdentity(req);
    const { limit, ttlSeconds } = config[tier];

    const key = `ratelimit:${config.route}:${tier}:${identity}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }

    const remaining = Math.max(0, limit - count);
    res.setHeader("X-RateLimit-Remaining", String(remaining));

    if (count > limit) {
      const ttl = await this.redis.ttl(key);
      res.setHeader("Retry-After", String(Math.max(ttl, 1)));
      throw new HttpException(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Too many requests — try again in ${Math.max(ttl, 1)}s.`,
            requestId: req.headers["x-request-id"] ?? "",
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private async resolveTierAndIdentity(
    req: Request & { user?: AuthenticatedUser },
  ): Promise<{ tier: "anonymous" | "free" | "pro"; identity: string }> {
    if (!req.user) {
      return { tier: "anonymous", identity: req.ip ?? req.socket.remoteAddress ?? "unknown" };
    }

    // Plan is looked up fresh rather than trusted from the (up to
    // 15-minute-old) access token, since an upgrade shouldn't require the
    // user to log out/in again to see the higher limit take effect.
    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId }, select: { plan: true } });
    const tier = user?.plan === "PRO" || user?.plan === "TEAM" ? "pro" : "free";
    return { tier, identity: req.user.userId };
  }
}
