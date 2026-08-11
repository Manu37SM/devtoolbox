import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CreateSnippetSchema, CursorQuerySchema, UpdateSnippetSchema } from "@devtoolbox/shared";
import { SnippetsService } from "./snippets.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("snippets")
export class SnippetsController {
  constructor(private readonly snippetsService: SnippetsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(CursorQuerySchema)) query: unknown,
  ) {
    return this.snippetsService.list(user.userId, query as Parameters<SnippetsService["list"]>[1]);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateSnippetSchema)) dto: unknown,
  ) {
    return this.snippetsService.create(user.userId, dto as Parameters<SnippetsService["create"]>[1]);
  }

  // Two path segments ("organization/:organizationId"), so it never
  // collides with the single-segment ":id" route below.
  @UseGuards(JwtAuthGuard)
  @Get("organization/:organizationId")
  async listForOrganization(@CurrentUser() user: AuthenticatedUser, @Param("organizationId") organizationId: string) {
    return this.snippetsService.listForOrganization(user.userId, organizationId);
  }

  // Owner or, if isPublic, anyone — hence the optional (not required) guard.
  @UseGuards(OptionalJwtAuthGuard)
  @Get(":id")
  async getOne(@CurrentUser() user: AuthenticatedUser | undefined, @Param("id") id: string) {
    return this.snippetsService.getOne(id, user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateSnippetSchema)) dto: unknown,
  ) {
    return this.snippetsService.update(user.userId, id, dto as Parameters<SnippetsService["update"]>[2]);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.snippetsService.softDelete(user.userId, id);
  }
}
