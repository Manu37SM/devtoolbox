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

type RazorpaySubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired";

@Injectable()
export class BillingService {
  private client: Razorpay | null | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createSubscription(userId: string, dto: CreateSubscriptionDto): Promise<CreateSubscriptionResult> {
    const client = this.getClient();
    const keyId = this.config.getOrThrow<string>("RAZORPAY_KEY_ID");

    const planId = this.planIdForPlan(dto.plan);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.ensureRazorpayCustomer(user.id, user.email, user.razorpayCustomerId);

    const subscription = await client.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 100,
      notes: { userId },
    });

    return { razorpaySubscriptionId: subscription.id, razorpayKeyId: keyId, plan: dto.plan };
  }

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
        break;
    }
  }

  private async syncSubscriptionByNotesUserId(entity: RazorpaySubscriptionEntity): Promise<void> {
    const userId = typeof entity.notes?.userId === "string" ? entity.notes.userId : undefined;
    if (!userId) return;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.razorpayCustomerId) return;

    await this.syncSubscriptionFromRazorpay(user.razorpayCustomerId, entity);
  }

  private async syncSubscriptionFromRazorpay(razorpayCustomerId: string, subscription: RazorpaySubscriptionEntity): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { razorpayCustomerId } });
    if (!user) return;

    const planId = subscription.plan_id;
    const plan = this.planForPlanId(planId);
    const status = subscription.status.toUpperCase() as SubscriptionStatus;

    const effectivePlan = plan && (status === "ACTIVE" || status === "AUTHENTICATED") ? plan : "FREE";
    const currentPeriodEnd = subscription.current_end
      ? new Date(subscription.current_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  status: RazorpaySubscriptionStatus;

  current_end?: number | null;
  cancel_at_cycle_end?: boolean | null;
  notes?: Record<string, unknown>;
}
