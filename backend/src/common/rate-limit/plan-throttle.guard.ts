import { CanActivate, ExecutionContext, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type Redis from "ioredis";
import type { Request, Response } from "express";
import { REDIS_CLIENT } from "../redis/redis.module";
import { PrismaService } from "../../database/prisma.service";
import { PLAN_THROTTLE_KEY, type PlanThrottleConfig } from "./plan-throttle.decorator";
import type { AuthenticatedUser } from "../../modules/auth/decorators/current-user.decorator";
import { resolveEffectivePlan } from "../plan/effective-plan";

@Injectable()
export class PlanThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<PlanThrottleConfig | undefined>(PLAN_THROTTLE_KEY, context.getHandler());
    if (!config) return true;

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

    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId }, select: { plan: true } });

    const effectivePlan = await resolveEffectivePlan(this.prisma, req.user.userId, user?.plan ?? "FREE");
    const tier = effectivePlan === "PRO" || effectivePlan === "TEAM" ? "pro" : "free";
    return { tier, identity: req.user.userId };
  }
}
