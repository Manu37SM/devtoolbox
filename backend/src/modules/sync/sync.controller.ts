import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AddFavoriteSchema, CreateHistoryEntrySchema, HistoryQuerySchema } from "@devtoolbox/shared";
import { SyncService } from "./sync.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get("favorites")
  async listFavorites(@CurrentUser() user: AuthenticatedUser) {
    return this.syncService.listFavorites(user.userId);
  }

  @Post("favorites")
  @HttpCode(201)
  async addFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(AddFavoriteSchema)) dto: unknown,
  ) {
    return this.syncService.addFavorite(user.userId, dto as Parameters<SyncService["addFavorite"]>[1]);
  }

  @Delete("favorites/:toolSlug")
  @HttpCode(204)
  async removeFavorite(@CurrentUser() user: AuthenticatedUser, @Param("toolSlug") toolSlug: string) {
    await this.syncService.removeFavorite(user.userId, toolSlug);
  }

  @Get("history")
  async listHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(HistoryQuerySchema)) query: unknown,
  ) {
    return this.syncService.listHistory(user.userId, query as Parameters<SyncService["listHistory"]>[1]);
  }

  @Post("history")
  @HttpCode(201)
  async createHistoryEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateHistoryEntrySchema)) dto: unknown,
  ) {
    return this.syncService.createHistoryEntry(
      user.userId,
      dto as Parameters<SyncService["createHistoryEntry"]>[1],
    );
  }

  @Delete("history/:id")
  @HttpCode(204)
  async deleteHistoryEntry(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.syncService.deleteHistoryEntry(user.userId, id);
  }

  @Delete("history")
  @HttpCode(204)
  async clearHistory(@CurrentUser() user: AuthenticatedUser) {
    await this.syncService.clearHistory(user.userId);
  }
}
