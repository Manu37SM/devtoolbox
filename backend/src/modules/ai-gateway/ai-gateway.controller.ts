import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AiDiffSummarySchema, AiExplainSchema, AiGenerateSchema, AiJsonRepairSchema } from "@devtoolbox/shared";
import { AiGatewayService } from "./ai-gateway.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

// Per API.md §12: 5/hour anonymous, 60/hour Free, 1000/hour Pro/Team,
// shared across all four action routes below (a single `/ai/*` budget, not
// one per endpoint — matches the API.md table's single `/ai/*` row).
const AI_THROTTLE = {
  anonymous: { limit: 5, ttlSeconds: 3_600 },
  free: { limit: 60, ttlSeconds: 3_600 },
  pro: { limit: 1_000, ttlSeconds: 3_600 },
} as const;

/**
 * Task-specific AI endpoints — see API.md §9. Every route uses
 * OptionalJwtAuthGuard (anonymous use allowed at a lower quota, same
 * pattern as /net/* and /shares) except GET /ai/usage, which is
 * meaningless without an account.
 */
@Controller("ai")
export class AiGatewayController {
  constructor(private readonly aiGatewayService: AiGatewayService) {}

  @PlanThrottle({ route: "ai-explain", ...AI_THROTTLE })
  @UseGuards(OptionalJwtAuthGuard, PlanThrottleGuard)
  @Post("explain")
  async explain(@CurrentUser() user: AuthenticatedUser | undefined, @Body(new ZodValidationPipe(AiExplainSchema)) dto: unknown) {
    return this.aiGatewayService.explain(dto as Parameters<AiGatewayService["explain"]>[0], user?.userId);
  }

  @PlanThrottle({ route: "ai-generate", ...AI_THROTTLE })
  @UseGuards(OptionalJwtAuthGuard, PlanThrottleGuard)
  @Post("generate")
  async generate(@CurrentUser() user: AuthenticatedUser | undefined, @Body(new ZodValidationPipe(AiGenerateSchema)) dto: unknown) {
    return this.aiGatewayService.generate(dto as Parameters<AiGatewayService["generate"]>[0], user?.userId);
  }

  @PlanThrottle({ route: "ai-diff-summary", ...AI_THROTTLE })
  @UseGuards(OptionalJwtAuthGuard, PlanThrottleGuard)
  @Post("diff-summary")
  async diffSummary(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body(new ZodValidationPipe(AiDiffSummarySchema)) dto: unknown,
  ) {
    return this.aiGatewayService.diffSummary(dto as Parameters<AiGatewayService["diffSummary"]>[0], user?.userId);
  }

  @PlanThrottle({ route: "ai-json-repair", ...AI_THROTTLE })
  @UseGuards(OptionalJwtAuthGuard, PlanThrottleGuard)
  @Post("json-repair")
  async jsonRepair(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body(new ZodValidationPipe(AiJsonRepairSchema)) dto: unknown,
  ) {
    return this.aiGatewayService.jsonRepair(dto as Parameters<AiGatewayService["jsonRepair"]>[0], user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("usage")
  async usage(@CurrentUser() user: AuthenticatedUser) {
    return this.aiGatewayService.getUsage(user.userId);
  }
}
