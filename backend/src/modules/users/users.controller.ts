import { Body, Controller, Delete, Get, HttpCode, Patch, UseGuards } from "@nestjs/common";
import { UpdateProfileSchema } from "@devtoolbox/shared";
import { UsersService } from "./users.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: unknown,
  ) {
    return this.usersService.updateProfile(user.userId, dto as Parameters<UsersService["updateProfile"]>[1]);
  }

  @Delete("me")
  @HttpCode(204)
  async deleteMe(@CurrentUser() user: AuthenticatedUser) {
    await this.usersService.softDelete(user.userId);
  }

  @Get("me/export")
  async exportMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.exportData(user.userId);
  }
}
