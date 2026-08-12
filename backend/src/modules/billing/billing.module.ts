import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

/** API.md §9, ARCHITECTURE.md §14.2 — Stripe Checkout/Customer Portal +
 * webhook sync into User.plan. */
@Module({
  controllers: [BillingController],
  providers: [BillingService],
  // Exported so UsersModule can cancel the underlying Razorpay subscription
  // on account deletion (AUDIT_REPORT.md §15.2/§24) — reuses the exact same
  // cancelSubscription() path the /billing/cancel-subscription route calls,
  // rather than a second copy of the Razorpay cancel-subscription call.
  exports: [BillingService],
})
export class BillingModule {}
