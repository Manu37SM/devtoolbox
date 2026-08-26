import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CreatePluginSchema, ReviewPluginVersionSchema, SubmitPluginVersionSchema } from "@devtoolbox/shared";
import { PluginsService } from "./plugins.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

@Controller("plugins")
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @PlanThrottle({
    route: "plugins-create",
    anonymous: { limit: 1, ttlSeconds: 3_600 },
    free: { limit: 20, ttlSeconds: 3_600 },
    pro: { limit: 20, ttlSeconds: 3_600 },
  })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(CreatePluginSchema)) dto: unknown) {
    return this.pluginsService.create(user.userId, dto as Parameters<PluginsService["create"]>[1]);
  }

  @PlanThrottle({
    route: "plugins-list",
    anonymous: { limit: 120, ttlSeconds: 3_600 },
    free: { limit: 300, ttlSeconds: 3_600 },
    pro: { limit: 300, ttlSeconds: 3_600 },
  })
  @UseGuards(PlanThrottleGuard)
  @Get()
  async listPublished() {
    return this.pluginsService.listPublished();
  }

  @PlanThrottle({
    route: "plugins-review-queue",
    anonymous: { limit: 1, ttlSeconds: 3_600 },
    free: { limit: 120, ttlSeconds: 3_600 },
    pro: { limit: 120, ttlSeconds: 3_600 },
  })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Get("review-queue")
  async listReviewQueue(@CurrentUser() user: AuthenticatedUser) {
    return this.pluginsService.listReviewQueue(user.userId);
  }

  @PlanThrottle({
    route: "plugins-detail",
    anonymous: { limit: 120, ttlSeconds: 3_600 },
    free: { limit: 300, ttlSeconds: 3_600 },
    pro: { limit: 300, ttlSeconds: 3_600 },
  })
  @UseGuards(OptionalJwtAuthGuard, PlanThrottleGuard)
  @Get(":slug")
  async getDetail(@CurrentUser() user: AuthenticatedUser | undefined, @Param("slug") slug: string) {
    return this.pluginsService.getDetail(slug, user?.userId);
  }

  @PlanThrottle({
    route: "plugins-run",
    anonymous: { limit: 120, ttlSeconds: 3_600 },
    free: { limit: 300, ttlSeconds: 3_600 },
    pro: { limit: 300, ttlSeconds: 3_600 },
  })
  @UseGuards(OptionalJwtAuthGuard, PlanThrottleGuard)
  @Get(":slug/run")
  async getRunPayload(@CurrentUser() user: AuthenticatedUser | undefined, @Param("slug") slug: string) {
    return this.pluginsService.getRunPayload(slug, user?.userId);
  }

  @PlanThrottle({
    route: "plugins-submit-version",
    anonymous: { limit: 1, ttlSeconds: 3_600 },
    free: { limit: 10, ttlSeconds: 3_600 },
    pro: { limit: 10, ttlSeconds: 3_600 },
  })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post(":id/versions")
  async submitVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(SubmitPluginVersionSchema)) dto: unknown,
  ) {
    return this.pluginsService.submitVersion(
      user.userId,
      id,
      dto as Parameters<PluginsService["submitVersion"]>[2],
    );
  }

  @PlanThrottle({
    route: "plugins-review",
    anonymous: { limit: 1, ttlSeconds: 3_600 },
    free: { limit: 120, ttlSeconds: 3_600 },
    pro: { limit: 120, ttlSeconds: 3_600 },
  })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post(":id/review")
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ReviewPluginVersionSchema)) dto: unknown,
  ) {
    const { decision } = dto as { decision: "APPROVE" | "REJECT" };
    return this.pluginsService.review(user.userId, id, decision);
  }

  @PlanThrottle({
    route: "plugins-suspend",
    anonymous: { limit: 1, ttlSeconds: 3_600 },
    free: { limit: 120, ttlSeconds: 3_600 },
    pro: { limit: 120, ttlSeconds: 3_600 },
  })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post(":id/suspend")
  async suspend(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.pluginsService.suspend(user.userId, id);
  }
}
