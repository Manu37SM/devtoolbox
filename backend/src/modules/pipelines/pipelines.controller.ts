import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CreateSyncedPipelineSchema, CursorQuerySchema, UpdateSyncedPipelineSchema } from "@devtoolbox/shared";
import { PipelinesService } from "./pipelines.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("pipelines")
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(CursorQuerySchema)) query: unknown,
  ) {
    return this.pipelinesService.list(user.userId, query as Parameters<PipelinesService["list"]>[1]);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateSyncedPipelineSchema)) dto: unknown,
  ) {
    return this.pipelinesService.create(user.userId, dto as Parameters<PipelinesService["create"]>[1]);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(":id")
  async getOne(@CurrentUser() user: AuthenticatedUser | undefined, @Param("id") id: string) {
    return this.pipelinesService.getOne(id, user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateSyncedPipelineSchema)) dto: unknown,
  ) {
    return this.pipelinesService.update(user.userId, id, dto as Parameters<PipelinesService["update"]>[2]);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.pipelinesService.softDelete(user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/duplicate")
  @HttpCode(201)
  async duplicate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.pipelinesService.duplicate(user.userId, id);
  }
}
