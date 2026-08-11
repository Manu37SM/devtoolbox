import { BadRequestException, Body, Controller, Get, Headers, Post, Req, UseGuards } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { CreateCheckoutSessionSchema } from "@devtoolbox/shared";
import { BillingService } from "./billing.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

const BILLING_THROTTLE = {
  anonymous: { limit: 1, ttlSeconds: 3_600 }, // unreachable — JwtAuthGuard blocks anonymous callers first
  free: { limit: 10, ttlSeconds: 3_600 },
  pro: { limit: 10, ttlSeconds: 3_600 },
} as const;

/** API.md §9 — Billing. Every route except the webhook is session-authed;
 * the webhook is Stripe-signature-authed instead (see BillingService.handleWebhookEvent
 * and main.ts's `rawBody: true`). */
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @PlanThrottle({ route: "billing-checkout", ...BILLING_THROTTLE })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post("checkout-session")
  async checkoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateCheckoutSessionSchema)) dto: unknown,
  ) {
    return this.billingService.createCheckoutSession(user.userId, dto as Parameters<BillingService["createCheckoutSession"]>[1]);
  }

  @PlanThrottle({ route: "billing-portal", ...BILLING_THROTTLE })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post("portal-session")
  async portalSession(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.createPortalSession(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("subscription")
  async subscription(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getSubscription(user.userId);
  }

  // No JwtAuthGuard/ApiKeyAuthGuard — this route is authenticated by
  // verifying Stripe's request signature against the raw body instead (see
  // main.ts's `rawBody: true` and API.md §9). Never add session/API-key
  // auth here; Stripe's servers have neither.
  @Post("webhook")
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers("stripe-signature") signature: string | undefined) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException("Missing webhook payload or signature.");
    }
    await this.billingService.handleWebhookEvent(req.rawBody, signature);
    return { received: true };
  }
}
