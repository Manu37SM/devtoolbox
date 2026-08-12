import { BadRequestException, Body, Controller, Get, Headers, Post, Req, UseGuards } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { CreateSubscriptionSchema, VerifyPaymentSchema } from "@devtoolbox/shared";
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

/** API.md §9 — Billing (Razorpay, migrated off Stripe — AUDIT_REPORT.md
 * §20). Every route except the webhook is session-authed; the webhook is
 * Razorpay-signature-authed instead (see BillingService.handleWebhookEvent
 * and main.ts's `rawBody: true`). */
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @PlanThrottle({ route: "billing-subscribe", ...BILLING_THROTTLE })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post("subscription")
  async createSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateSubscriptionSchema)) dto: unknown,
  ) {
    return this.billingService.createSubscription(user.userId, dto as Parameters<BillingService["createSubscription"]>[1]);
  }

  // Razorpay Checkout.js's success handler runs client-side and hands the
  // frontend a payment id + subscription id + signature — this route
  // verifies that signature server-side before trusting the payment
  // happened (never trust a client-reported "it worked").
  @PlanThrottle({ route: "billing-verify", ...BILLING_THROTTLE })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post("verify-payment")
  async verifyPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(VerifyPaymentSchema)) dto: unknown,
  ) {
    return this.billingService.verifyPayment(user.userId, dto as Parameters<BillingService["verifyPayment"]>[1]);
  }

  // No Razorpay-hosted billing portal to redirect to (AUDIT_REPORT.md §20
  // deviation note) — cancellation is a direct API call instead.
  @PlanThrottle({ route: "billing-cancel", ...BILLING_THROTTLE })
  @UseGuards(JwtAuthGuard, PlanThrottleGuard)
  @Post("cancel-subscription")
  async cancelSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.cancelSubscription(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("subscription")
  async subscription(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getSubscription(user.userId);
  }

  // No JwtAuthGuard/ApiKeyAuthGuard — this route is authenticated by
  // verifying Razorpay's request signature against the raw body instead
  // (see main.ts's `rawBody: true` and API.md §9). Never add session/API-key
  // auth here; Razorpay's servers have neither.
  @Post("webhook")
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers("x-razorpay-signature") signature: string | undefined) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException("Missing webhook payload or signature.");
    }
    await this.billingService.handleWebhookEvent(req.rawBody, signature);
    return { received: true };
  }
}
