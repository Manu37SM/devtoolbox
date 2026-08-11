import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

/** API.md §9, ARCHITECTURE.md §14.2 — Stripe Checkout/Customer Portal +
 * webhook sync into User.plan. */
@Module({
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
