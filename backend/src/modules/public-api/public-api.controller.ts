import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { PublicHashSchema, PublicJsonValidateSchema } from "@devtoolbox/shared";
import { PublicApiService } from "./public-api.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ApiKeyAuthGuard } from "../api-keys/guards/api-key-auth.guard";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

// API.md §14: 5000/hour/user, shared across every key on the account — no
// anonymous or free-plan access at all, so the "anonymous"/"free" tiers
// below are unreachable (ApiKeyAuthGuard throws before PlanThrottleGuard
// ever runs for those cases) but PlanThrottleConfig requires all three.
const PUBLIC_API_THROTTLE = {
  anonymous: { limit: 1, ttlSeconds: 3_600 },
  free: { limit: 1, ttlSeconds: 3_600 },
  pro: { limit: 5_000, ttlSeconds: 3_600 },
} as const;

/** API.md §12 — Public API, gated by ApiKeyAuthGuard (PRO/TEAM only). Nest's
 * global "v1" prefix (main.ts) plus this controller's "public" base makes
 * these routes /v1/public/*. */
@Controller("public")
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @PlanThrottle({ route: "public-hash", ...PUBLIC_API_THROTTLE })
  @UseGuards(ApiKeyAuthGuard, PlanThrottleGuard)
  @Post("hash")
  hash(@Body(new ZodValidationPipe(PublicHashSchema)) dto: unknown) {
    return this.publicApiService.hash(dto as Parameters<PublicApiService["hash"]>[0]);
  }

  @PlanThrottle({ route: "public-json-validate", ...PUBLIC_API_THROTTLE })
  @UseGuards(ApiKeyAuthGuard, PlanThrottleGuard)
  @Post("json-validate")
  jsonValidate(@Body(new ZodValidationPipe(PublicJsonValidateSchema)) dto: unknown) {
    return this.publicApiService.jsonValidate(dto as Parameters<PublicApiService["jsonValidate"]>[0]);
  }
}
