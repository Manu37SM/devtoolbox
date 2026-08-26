import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { CreateShareLinkSchema } from "@devtoolbox/shared";
import { ShareService } from "./share.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

@Controller("shares")
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @PlanThrottle({
    route: "shares-create",
    anonymous: { limit: 20, ttlSeconds: 3_600 },
    free: { limit: 100, ttlSeconds: 3_600 },
    pro: { limit: 1000, ttlSeconds: 3_600 },
  })
  @UseGuards(OptionalJwtAuthGuard, PlanThrottleGuard)
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body(new ZodValidationPipe(CreateShareLinkSchema)) dto: unknown,
  ) {
    return this.shareService.create(user?.userId, dto as Parameters<ShareService["create"]>[1]);
  }

  @Get(":slug")
  async resolve(@Param("slug") slug: string) {
    return this.shareService.resolve(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":slug")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("slug") slug: string) {
    await this.shareService.remove(user.userId, slug);
  }
}
