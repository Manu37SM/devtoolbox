import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import type {
  BillablePlan,
  CancelSubscriptionResult,
  CreateSubscriptionDto,
  CreateSubscriptionResult,
  SubscriptionStatus,
  SubscriptionSummary,
  VerifyPaymentDto,
} from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";

// Razorpay's own subscription-status vocabulary — used to decide whether a
// synced status still grants the paid plan. Kept local to this file (rather
// than imported from the SDK, which doesn't export a status union) so the
// "which statuses count as paid" decision is visible in one place.
type RazorpaySubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired";

/**
 * Razorpay subscriptions — API.md §9, ARCHITECTURE.md §14.2. Migrated off
 * Stripe (AUDIT_REPORT.md §20 — Stripe doesn't support billing for this
 * business from India). No card/UPI data ever reaches this backend; this
 * service only ever talks to Razorpay's API and reflects the result into
 * `User.plan` (the value every other plan check already reads —
 * PlanThrottleGuard, ApiKeysService, AI Gateway quotas) and the
 * `Subscription` table (support/debug mirror of Razorpay's own state,
 * DATABASE.md §3).
 *
 * Two structural differences from the old Stripe design, both documented in
 * AUDIT_REPORT.md §20:
 *  1. Razorpay has no hosted Checkout page — `createSubscription` returns a
 *     subscription id + publishable key id for the frontend to open
 *     Razorpay's Checkout.js modal with, instead of a redirect URL.
 *  2. Razorpay has no hosted Customer Portal — `cancelSubscription` is a
 *     direct API call the account page triggers, instead of a redirect to a
 *     provider-hosted management page.
 */
@Injectable()
export class BillingService {
  private client: Razorpay | null | undefined; // undefined = not yet resolved, null = no keys configured

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createSubscription(userId: string, dto: CreateSubscriptionDto): Promise<CreateSubscriptionResult> {
    const client = this.getClient();
    const keyId = this.config.getOrThrow<string>("RAZORPAY_KEY_ID");
    // Resolved before ensureRazorpayCustomer() deliberately — a misconfigured
    // plan id should fail fast without the side effect of creating a
    // Razorpay customer for a subscription that can never succeed.
    const planId = this.planIdForPlan(dto.plan);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.ensureRazorpayCustomer(user.id, user.email, user.razorpayCustomerId);

    // `total_count` is required by Razorpay's API even for an
    // effectively-open-ended subscription — 100 billing cycles (100 months
    // on a monthly plan) is treated as "no practical end," renewed by the
    // user re-subscribing well before it would ever lapse.
    const subscription = await client.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 100,
      notes: { userId },
    });

    return { razorpaySubscriptionId: subscription.id, razorpayKeyId: keyId, plan: dto.plan };
  }

  /** Verifies Razorpay Checkout.js's success-handler payload
   * (HMAC-SHA256 of `payment_id|subscription_id` keyed by the account's key
   * secret — Razorpay's documented subscription-verification formula)
   * before trusting it, then does an immediate optimistic sync so the UI
   * doesn't have to wait on webhook delivery. The webhook handler below
   * performs the same sync idempotently, so a missed or duplicated webhook
   * event can't leave `User.plan` out of sync. */
  async verifyPayment(userId: string, dto: VerifyPaymentDto): Promise<SubscriptionSummary | null> {
    const keySecret = this.config.get<string>("RAZORPAY_KEY_SECRET");
    if (!keySecret) {
      throw new ServiceUnavailableException("Billing isn't configured on this server.");
    }

    const expected = createHmac("sha256", keySecret)
      .update(`${dto.razorpay_payment_id}|${dto.razorpay_subscription_id}`)
      .digest("hex");
    const provided = Buffer.from(dto.razorpay_signature, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
      throw new BadRequestException("Invalid payment signature.");
    }

    const client = this.getClient();
    const subscription = await client.subscriptions.fetch(dto.razorpay_subscription_id);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.razorpayCustomerId) {
      throw new BadRequestException("No billing account linked to this user.");
    }
    await this.syncSubscriptionFromRazorpay(user.razorpayCustomerId, subscription);
    return this.getSubscription(userId);
  }

  /** No Razorpay-hosted portal exists to redirect to (AUDIT_REPORT.md §20)
   * — cancellation is a direct API call. `cancel_at_cycle_end: 1` matches
   * the old Stripe flow's "cancel at period end" default: the user keeps
   * paid access through what they already paid for. */
  async cancelSubscription(userId: string): Promise<CancelSubscriptionResult> {
    const client = this.getClient();
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) {
      throw new NotFoundException("No active subscription to cancel.");
    }

    await client.subscriptions.cancel(subscription.razorpaySubscriptionId, true);
    await this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
    return { cancelled: true };
  }

  async getSubscription(userId: string): Promise<SubscriptionSummary | null> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) return null;

    return {
      plan: subscription.plan as BillablePlan,
      status: subscription.status as SubscriptionStatus,
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  /** Verifies Razorpay's `X-Razorpay-Signature` header (HMAC-SHA256 of the
   * exact raw request bytes, keyed by the webhook secret — API.md §9; this
   * is the one route in the API not authed by session or API key) and
   * dispatches the small set of events that change plan state. Unrecognized
   * event types are acknowledged (200) and ignored — Razorpay retries on
   * non-2xx, and there's no reason to retry an event we intentionally don't
   * act on. */
  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new ServiceUnavailableException("Billing webhooks aren't configured on this server.");
    }

    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const provided = Buffer.from(signature, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
      throw new BadRequestException("Invalid webhook signature.");
    }

    let event: {
      event: string;
      payload?: { subscription?: { entity?: RazorpaySubscriptionEntity } };
    };
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException("Malformed webhook payload.");
    }

    switch (event.event) {
      case "subscription.activated":
      case "subscription.charged":
      case "subscription.pending":
      case "subscription.halted":
      case "subscription.cancelled":
      case "subscription.completed": {
        const entity = event.payload?.subscription?.entity;
        if (entity) {
          await this.syncSubscriptionByNotesUserId(entity);
        }
        break;
      }
      default:
        break; // acknowledged, intentionally ignored
    }
  }

  /** Webhook payloads carry the subscription entity, which has the
   * `userId` we stashed in `notes` at creation time (not a Razorpay
   * customer id on every event type) — resolving by that is more robust
   * across event shapes than assuming a `customer_id` field is always
   * present. */
  private async syncSubscriptionByNotesUserId(entity: RazorpaySubscriptionEntity): Promise<void> {
    const userId = typeof entity.notes?.userId === "string" ? entity.notes.userId : undefined;
    if (!userId) return; // subscription created outside this flow — nothing to sync

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.razorpayCustomerId) return; // user since deleted, or never linked — nothing to sync

    await this.syncSubscriptionFromRazorpay(user.razorpayCustomerId, entity);
  }

  private async syncSubscriptionFromRazorpay(razorpayCustomerId: string, subscription: RazorpaySubscriptionEntity): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { razorpayCustomerId } });
    if (!user) return; // customer created outside this flow, or user since deleted — nothing to sync

    const planId = subscription.plan_id;
    const plan = this.planForPlanId(planId);
    const status = subscription.status.toUpperCase() as SubscriptionStatus;
    // Only ACTIVE (and AUTHENTICATED — the brief window after the first
    // successful mandate authorization but before the first charge posts)
    // grant the paid plan; anything else (halted, cancelled, expired, ...)
    // falls back to FREE rather than leaving a stale paid plan on a
    // subscription that's no longer in good standing. Same fail-closed
    // posture as the original Stripe design: a billing hiccup should never
    // leave a paid-tier gate open.
    const effectivePlan = plan && (status === "ACTIVE" || status === "AUTHENTICATED") ? plan : "FREE";
    const currentPeriodEnd = subscription.current_end
      ? new Date(subscription.current_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Razorpay omits current_end before the first charge; fall back to +30d rather than crash

    await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          razorpaySubscriptionId: subscription.id,
          razorpayPlanId: planId ?? "",
          plan: plan ?? "FREE",
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd: Boolean(subscription.cancel_at_cycle_end || subscription.status === "cancelled"),
        },
        update: {
          razorpayPlanId: planId ?? "",
          plan: plan ?? "FREE",
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd: Boolean(subscription.cancel_at_cycle_end || subscription.status === "cancelled"),
        },
      }),
      this.prisma.user.update({ where: { id: user.id }, data: { plan: effectivePlan } }),
    ]);
  }

  private async ensureRazorpayCustomer(userId: string, email: string, existingCustomerId: string | null): Promise<string> {
    if (existingCustomerId) return existingCustomerId;

    const client = this.getClient();
    const customer = await client.customers.create({ email, notes: { userId } });
    await this.prisma.user.update({ where: { id: userId }, data: { razorpayCustomerId: customer.id } });
    return customer.id;
  }

  private planIdForPlan(plan: BillablePlan): string {
    const planId = this.config.get<string>(`RAZORPAY_PLAN_ID_${plan}`);
    if (!planId) {
      throw new ServiceUnavailableException(`Billing isn't configured for the ${plan} plan on this server.`);
    }
    return planId;
  }

  private planForPlanId(planId: string | undefined): BillablePlan | null {
    if (!planId) return null;
    if (planId === this.config.get<string>("RAZORPAY_PLAN_ID_PRO")) return "PRO";
    if (planId === this.config.get<string>("RAZORPAY_PLAN_ID_TEAM")) return "TEAM";
    return null;
  }

  private getClient(): Razorpay {
    if (this.client === undefined) {
      const keyId = this.config.get<string>("RAZORPAY_KEY_ID");
      const keySecret = this.config.get<string>("RAZORPAY_KEY_SECRET");
      this.client = keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
    }
    if (!this.client) {
      throw new ServiceUnavailableException("Billing isn't configured on this server.");
    }
    return this.client;
  }
}

// Minimal shape of the fields this service actually reads off a Razorpay
// subscription entity — the `razorpay` package ships loosely-typed
// `any`-ish responses, so this is asserted at the boundary rather than
// trusting the SDK's own (weak) types.
interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  status: RazorpaySubscriptionStatus;
  // The real `razorpay` SDK types these as `T | null | undefined` (Razorpay's
  // API omits them entirely before the subscription's first charge, and the
  // SDK's own types account for that with `null` as well as `undefined`) —
  // matched here so `client.subscriptions.fetch()`'s return type is
  // structurally assignable without an unsafe cast.
  current_end?: number | null;
  cancel_at_cycle_end?: boolean | null;
  notes?: Record<string, unknown>;
}
