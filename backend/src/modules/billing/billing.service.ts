import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import type {
  BillablePlan,
  CheckoutSessionResult,
  CreateCheckoutSessionDto,
  PortalSessionResult,
  SubscriptionStatus,
  SubscriptionSummary,
} from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";

/**
 * Stripe-hosted Checkout + Customer Portal — API.md §9, ARCHITECTURE.md
 * §14.2. No card data ever reaches this backend; this service only ever
 * talks to Stripe's API and reflects the result into `User.plan` (the value
 * every other plan check already reads — PlanThrottleGuard, ApiKeysService,
 * AI Gateway quotas) and the `Subscription` table (support/debug mirror of
 * Stripe's own state, DATABASE.md §3).
 */
@Injectable()
export class BillingService {
  private client: Stripe | null | undefined; // undefined = not yet resolved, null = no key configured

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createCheckoutSession(userId: string, dto: CreateCheckoutSessionDto): Promise<CheckoutSessionResult> {
    const client = this.getClient();
    // Resolved before ensureStripeCustomer() deliberately — a misconfigured
    // price ID should fail fast without the side effect of creating a
    // Stripe customer for a checkout that can never succeed.
    const priceId = this.priceIdForPlan(dto.plan);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const customerId = await this.ensureStripeCustomer(user.id, user.email, user.stripeCustomerId);
    const frontendUrl = this.config.getOrThrow<string>("FRONTEND_URL");

    const session = await client.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/account?checkout=success`,
      cancel_url: `${frontendUrl}/account?checkout=cancelled`,
      client_reference_id: userId,
    });

    if (!session.url) {
      throw new BadRequestException("Stripe didn't return a checkout URL.");
    }
    return { url: session.url };
  }

  async createPortalSession(userId: string): Promise<PortalSessionResult> {
    const client = this.getClient();
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.stripeCustomerId) {
      throw new NotFoundException("No billing account yet — subscribe first.");
    }

    const frontendUrl = this.config.getOrThrow<string>("FRONTEND_URL");
    const session = await client.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/account`,
    });

    return { url: session.url };
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

  /** Verifies Stripe's signature against the exact raw request bytes
   * (API.md §9 — this is the one route in the API not authed by session or
   * API key) and dispatches the small set of events that change plan
   * state. Unrecognized event types are acknowledged (200) and ignored —
   * Stripe retries on non-2xx, and there's no reason to retry an event we
   * intentionally don't act on. */
  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    const client = this.getClient();
    const webhookSecret = this.config.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new ServiceUnavailableException("Billing webhooks aren't configured on this server.");
    }

    let event: Stripe.Event;
    try {
      event = client.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException("Invalid webhook signature.");
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (typeof session.subscription === "string" && typeof session.customer === "string") {
          const subscription = await client.subscriptions.retrieve(session.subscription);
          await this.syncSubscriptionFromStripe(session.customer, subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        if (typeof subscription.customer === "string") {
          await this.syncSubscriptionFromStripe(subscription.customer, subscription);
        }
        break;
      }
      default:
        break; // acknowledged, intentionally ignored
    }
  }

  private async syncSubscriptionFromStripe(stripeCustomerId: string, subscription: Stripe.Subscription): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { stripeCustomerId } });
    if (!user) return; // customer created outside this flow, or user since deleted — nothing to sync

    const priceId = subscription.items.data[0]?.price.id;
    const plan = this.planForPriceId(priceId);
    const status = subscription.status.toUpperCase() as SubscriptionStatus;
    // Only ACTIVE/TRIALING subscriptions grant the paid plan — anything
    // else (past_due, canceled, unpaid, ...) falls back to FREE rather than
    // leaving a stale paid plan on a subscription that's no longer good
    // standing. Downgrading on PAST_DUE (not waiting for full cancellation)
    // is a deliberate choice: matches "no core tool is ever paywalled" — a
    // billing hiccup on the Public API tier should fail closed, not open.
    const effectivePlan = plan && (status === "ACTIVE" || status === "TRIALING") ? plan : "FREE";

    await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId ?? "",
          plan: plan ?? "FREE",
          status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
        update: {
          stripePriceId: priceId ?? "",
          plan: plan ?? "FREE",
          status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      }),
      this.prisma.user.update({ where: { id: user.id }, data: { plan: effectivePlan } }),
    ]);
  }

  private async ensureStripeCustomer(userId: string, email: string, existingCustomerId: string | null): Promise<string> {
    if (existingCustomerId) return existingCustomerId;

    const client = this.getClient();
    const customer = await client.customers.create({ email, metadata: { userId } });
    await this.prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
    return customer.id;
  }

  private priceIdForPlan(plan: BillablePlan): string {
    const priceId = this.config.get<string>(`STRIPE_PRICE_ID_${plan}`);
    if (!priceId) {
      throw new ServiceUnavailableException(`Billing isn't configured for the ${plan} plan on this server.`);
    }
    return priceId;
  }

  private planForPriceId(priceId: string | undefined): BillablePlan | null {
    if (!priceId) return null;
    if (priceId === this.config.get<string>("STRIPE_PRICE_ID_PRO")) return "PRO";
    if (priceId === this.config.get<string>("STRIPE_PRICE_ID_TEAM")) return "TEAM";
    return null;
  }

  private getClient(): Stripe {
    if (this.client === undefined) {
      const secretKey = this.config.get<string>("STRIPE_SECRET_KEY");
      this.client = secretKey ? new Stripe(secretKey) : null;
    }
    if (!this.client) {
      throw new ServiceUnavailableException("Billing isn't configured on this server.");
    }
    return this.client;
  }
}
