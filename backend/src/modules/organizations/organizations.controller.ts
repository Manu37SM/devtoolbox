import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  AddOrganizationMemberSchema,
  CreateOrganizationSchema,
  UpdateOrganizationMemberRoleSchema,
  UpdateOrganizationSchema,
} from "@devtoolbox/shared";
import { OrganizationsService } from "./organizations.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

/** Team workspaces — API.md §17. Every route requires a signed-in user;
 * there's no anonymous or API-key-authed access to org management. */
@PlanThrottle({
  route: "organizations",
  anonymous: { limit: 1, ttlSeconds: 3_600 }, // unreachable — JwtAuthGuard blocks anonymous callers first
  free: { limit: 60, ttlSeconds: 3_600 },
  pro: { limit: 60, ttlSeconds: 3_600 },
})
@UseGuards(JwtAuthGuard, PlanThrottleGuard)
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateOrganizationSchema)) dto: unknown,
  ) {
    return this.organizationsService.create(user.userId, dto as Parameters<OrganizationsService["create"]>[1]);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.listForUser(user.userId);
  }

  @Get(":id")
  async getOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.organizationsService.getDetail(user.userId, id);
  }

  @Patch(":id")
  async rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateOrganizationSchema)) dto: unknown,
  ) {
    return this.organizationsService.rename(user.userId, id, dto as Parameters<OrganizationsService["rename"]>[2]);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.organizationsService.delete(user.userId, id);
  }

  @Post(":id/members")
  @HttpCode(201)
  async addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AddOrganizationMemberSchema)) dto: unknown,
  ) {
    return this.organizationsService.addMember(
      user.userId,
      id,
      dto as Parameters<OrganizationsService["addMember"]>[2],
    );
  }

  @Patch(":id/members/:userId")
  async updateMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("userId") targetUserId: string,
    @Body(new ZodValidationPipe(UpdateOrganizationMemberRoleSchema)) dto: unknown,
  ) {
    return this.organizationsService.updateMemberRole(
      user.userId,
      id,
      targetUserId,
      dto as Parameters<OrganizationsService["updateMemberRole"]>[3],
    );
  }

  @Delete(":id/members/:userId")
  @HttpCode(204)
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("userId") targetUserId: string,
  ) {
    await this.organizationsService.removeMember(user.userId, id, targetUserId);
  }

  @Get(":id/usage")
  async getUsage(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.organizationsService.getUsage(user.userId, id);
  }
}
