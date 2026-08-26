import { SetMetadata } from "@nestjs/common";

export interface PlanThrottleConfig {

  route: string;
  anonymous: { limit: number; ttlSeconds: number };
  free: { limit: number; ttlSeconds: number };
  pro: { limit: number; ttlSeconds: number };
}

export const PLAN_THROTTLE_KEY = "plan_throttle";

export const PlanThrottle = (config: PlanThrottleConfig) => SetMetadata(PLAN_THROTTLE_KEY, config);
