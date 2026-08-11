import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CreatePluginSchema, ReviewPluginVersionSchema, SubmitPluginVersionSchema } from "@devtoolbox/shared";
import { PluginsService } from "./plugins.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

/** Plugin marketplace — API.md §18. Listing/running is public; creating and
 * submitting versions requires a signed-in user; review-queue actions
 * additionally require `User.isAdmin` (checked in the service layer, same
 * convention as OrganizationsService's role checks). */
@PlanThrottle({
  route: "plugins",
  anonymous: { limit: 120, ttlSeconds: 3_600 },
  free: { limit: 120, ttlSeconds: 3_600 },
  pro: { limit: 120, ttlSeconds: 3_600 },
})
@UseGuards(PlanThrottleGuard)
@Controller("plugins")
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(CreatePluginSchema)) dto: unknown) {
    return this.pluginsService.create(user.userId, dto as Parameters<PluginsService["create"]>[1]);
  }

  @Get()
  async listPublished() {
    return this.pluginsService.listPublished();
  }

  @UseGuards(JwtAuthGuard)
  @Get("review-queue")
  async listReviewQueue(@CurrentUser() user: AuthenticatedUser) {
    return this.pluginsService.listReviewQueue(user.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(":slug")
  async getDetail(@CurrentUser() user: AuthenticatedUser | undefined, @Param("slug") slug: string) {
    return this.pluginsService.getDetail(slug, user?.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(":slug/run")
  async getRunPayload(@CurrentUser() user: AuthenticatedUser | undefined, @Param("slug") slug: string) {
    return this.pluginsService.getRunPayload(slug, user?.userId);
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Post(":id/review")
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ReviewPluginVersionSchema)) dto: unknown,
  ) {
    const { decision } = dto as { decision: "APPROVE" | "REJECT" };
    return this.pluginsService.review(user.userId, id, decision);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/suspend")
  async suspend(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.pluginsService.suspend(user.userId, id);
  }
}
