import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CreateShareLinkSchema } from "@devtoolbox/shared";
import { ShareService } from "./share.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("shares")
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  // 20/hour/IP anonymous per API.md §12 — the harshest tier since this
  // route accepts anonymous writes. (Per-user higher limits for signed-in
  // Free/Pro callers aren't differentiated yet — same simplification as
  // every other @Throttle usage in this codebase so far.)
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @UseGuards(OptionalJwtAuthGuard)
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
