import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { CreateApiKeySchema } from "@devtoolbox/shared";
import { ApiKeysService } from "./api-keys.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

/** API.md §11 — session-authed key management for §12's Public API.
 * Every route requires a signed-in user (JwtAuthGuard); there's no
 * anonymous or API-key-authed access to these routes themselves. */
@Controller("api-keys")
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @PlanThrottle({
    route: "api-keys-create",
    anonymous: { limit: 1, ttlSeconds: 3_600 }, // unreachable — JwtAuthGuard blocks anonymous callers first
    free: { limit: 30, ttlSeconds: 3_600 },
    pro: { limit: 30, ttlSeconds: 3_600 },
  })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(CreateApiKeySchema)) dto: unknown) {
    return this.apiKeysService.createKey(user.userId, (dto as { name: string }).name);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.apiKeysService.listKeys(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  @HttpCode(204)
  async revoke(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.apiKeysService.revokeKey(user.userId, id);
  }
}
