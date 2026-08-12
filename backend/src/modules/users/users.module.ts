import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { BillingModule } from "../billing/billing.module";

/**
 * Current-user profile, account deletion, data export. See API.md section 3.
 *
 * Imports BillingModule so account deletion can cancel the user's
 * underlying Razorpay subscription (AUDIT_REPORT.md §15.2/§24) — closes a
 * disclosed gap where soft-delete revoked app access but left billing
 * running.
 */
@Module({
  imports: [BillingModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
