import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  AddOrganizationMemberSchema,
  CreateOrganizationSchema,
  UpdateOrganizationBrandingSchema,
  UpdateOrganizationMemberRoleSchema,
  UpdateOrganizationSchema,
} from "@devtoolbox/shared";
import { OrganizationsService } from "./organizations.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

const ORG_THROTTLE = {
  route: "organizations",
  anonymous: { limit: 1, ttlSeconds: 3_600 },
  free: { limit: 60, ttlSeconds: 3_600 },
  pro: { limit: 60, ttlSeconds: 3_600 },
} as const;

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateOrganizationSchema)) dto: unknown,
  ) {
    return this.organizationsService.create(user.userId, dto as Parameters<OrganizationsService["create"]>[1]);
  }

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.listForUser(user.userId);
  }

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Get(":id")
  async getOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.organizationsService.getDetail(user.userId, id);
  }

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Patch(":id")
  async rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateOrganizationSchema)) dto: unknown,
  ) {
    return this.organizationsService.rename(user.userId, id, dto as Parameters<OrganizationsService["rename"]>[2]);
  }

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Patch(":id/branding")
  async updateBranding(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateOrganizationBrandingSchema)) dto: unknown,
  ) {
    return this.organizationsService.updateBranding(
      user.userId,
      id,
      dto as Parameters<OrganizationsService["updateBranding"]>[2],
    );
  }

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.organizationsService.delete(user.userId, id);
  }

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
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

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
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

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Delete(":id/members/:userId")
  @HttpCode(204)
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("userId") targetUserId: string,
  ) {
    await this.organizationsService.removeMember(user.userId, id, targetUserId);
  }

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Get(":id/usage")
  async getUsage(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.organizationsService.getUsage(user.userId, id);
  }

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Get(":id/invites")
  async listInvites(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.organizationsService.listInvites(user.userId, id);
  }

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Delete(":id/invites/:inviteId")
  @HttpCode(204)
  async revokeInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("inviteId") inviteId: string,
  ) {
    await this.organizationsService.revokeInvite(user.userId, id, inviteId);
  }

  @PlanThrottle(ORG_THROTTLE)
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post("invites/:token/accept")
  async acceptInvite(@CurrentUser() user: AuthenticatedUser, @Param("token") token: string) {
    return this.organizationsService.acceptInvite(user.userId, token);
  }
}
