-- Migrate billing provider: Stripe -> Razorpay (AUDIT_REPORT.md §20).
-- Stripe doesn't support this business's billing needs from India, so the
-- Phase 4 billing integration (20260811130000_add_billing) is replaced
-- end-to-end before any real subscription exists in production — this is a
-- clean rename/retype migration rather than a data-preserving backfill,
-- since no live Stripe subscriptions have been created against this schema.

-- RenameColumn: User.stripeCustomerId -> User.razorpayCustomerId
ALTER TABLE "User" RENAME COLUMN "stripeCustomerId" TO "razorpayCustomerId";
ALTER INDEX "User_stripeCustomerId_key" RENAME TO "User_razorpayCustomerId_key";

-- RenameColumn: Subscription.stripeSubscriptionId -> Subscription.razorpaySubscriptionId
ALTER TABLE "Subscription" RENAME COLUMN "stripeSubscriptionId" TO "razorpaySubscriptionId";
ALTER INDEX "Subscription_stripeSubscriptionId_key" RENAME TO "Subscription_razorpaySubscriptionId_key";

-- RenameColumn: Subscription.stripePriceId -> Subscription.razorpayPlanId
ALTER TABLE "Subscription" RENAME COLUMN "stripePriceId" TO "razorpayPlanId";

-- Replace SubscriptionStatus enum with Razorpay's status vocabulary. Postgres
-- can't remove/rename individual enum values in place when the full value
-- set changes shape, so this creates a new type, retypes the column via an
-- explicit mapping, then drops the old type. Any row in a Stripe-only status
-- (PAST_DUE, INCOMPLETE, INCOMPLETE_EXPIRED, TRIALING, UNPAID, CANCELED) is
-- mapped to its closest Razorpay analog; again, no production data is
-- expected to exist yet, so this mapping is a safety net, not a load-bearing
-- migration path.
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('CREATED', 'AUTHENTICATED', 'ACTIVE', 'PENDING', 'HALTED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING (
  CASE "status"::text
    WHEN 'ACTIVE' THEN 'ACTIVE'
    WHEN 'TRIALING' THEN 'AUTHENTICATED'
    WHEN 'PAST_DUE' THEN 'HALTED'
    WHEN 'UNPAID' THEN 'HALTED'
    WHEN 'CANCELED' THEN 'CANCELLED'
    WHEN 'INCOMPLETE' THEN 'CREATED'
    WHEN 'INCOMPLETE_EXPIRED' THEN 'EXPIRED'
    ELSE 'CREATED'
  END::"SubscriptionStatus_new"
);

DROP TYPE "SubscriptionStatus";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
