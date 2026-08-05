import { SetMetadata } from "@nestjs/common";

export interface PlanThrottleConfig {
  /** A short, stable identifier for this route — used as part of the
   * Redis key, so it must be unique per `@PlanThrottle` usage. */
  route: string;
  anonymous: { limit: number; ttlSeconds: number };
  free: { limit: number; ttlSeconds: number };
  pro: { limit: number; ttlSeconds: number };
}

export const PLAN_THROTTLE_KEY = "plan_throttle";

/** Per-plan-tier rate limiting per API.md §12's differentiated anon/free/
 * pro columns — the flat `@Throttle` decorator (still used everywhere
 * else in this codebase) can't express "different limits for different
 * signed-in plans," only a single limit per route. Pair with
 * `PlanThrottleGuard` and put an auth guard (JwtAuthGuard or
 * OptionalJwtAuthGuard) *before* it in the same `@UseGuards(...)` call so
 * `req.user` is populated first. */
export const PlanThrottle = (config: PlanThrottleConfig) => SetMetadata(PLAN_THROTTLE_KEY, config);
