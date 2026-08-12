import { createHmac } from "node:crypto";
import { BadRequestException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { BillingService } from "./billing.service";

const mockSubscriptionsCreate = jest.fn();
const mockSubscriptionsFetch = jest.fn();
const mockSubscriptionsCancel = jest.fn();
const mockCustomersCreate = jest.fn();

jest.mock("razorpay", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      subscriptions: { create: mockSubscriptionsCreate, fetch: mockSubscriptionsFetch, cancel: mockSubscriptionsCancel },
      customers: { create: mockCustomersCreate },
    })),
  };
});

const WEBHOOK_SECRET = "whsec_test_123";
const KEY_SECRET = "key_secret_test_123";

function signWebhook(body: string, secret = WEBHOOK_SECRET): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function signPayment(paymentId: string, subscriptionId: string, secret = KEY_SECRET): string {
  return createHmac("sha256", secret).update(`${paymentId}|${subscriptionId}`).digest("hex");
}

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    RAZORPAY_KEY_ID: "rzp_test_123",
    RAZORPAY_KEY_SECRET: KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    RAZORPAY_PLAN_ID_PRO: "plan_pro",
    RAZORPAY_PLAN_ID_TEAM: "plan_team",
    FRONTEND_URL: "https://devtoolbox.dev",
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => {
      const v = values[key];
      if (v === undefined) throw new Error(`Missing config: ${key}`);
      return v;
    }),
  };
}

function makePrisma(overrides: { user?: Record<string, unknown>; subscription?: Record<string, unknown> } = {}) {
  return {
    user: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.com", razorpayCustomerId: null }),
      findUnique: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.com" }),
      update: jest.fn().mockResolvedValue({}),
      ...overrides.user,
    },
    subscription: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      ...overrides.subscription,
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
}

function fakeSubscriptionEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_123",
    plan_id: "plan_pro",
    status: "active",
    current_end: 1_800_000_000,
    cancel_at_cycle_end: false,
    notes: { userId: "user-1" },
    ...overrides,
  };
}

describe("BillingService", () => {
  beforeEach(() => {
    mockSubscriptionsCreate.mockReset();
    mockSubscriptionsFetch.mockReset();
    mockSubscriptionsCancel.mockReset();
    mockCustomersCreate.mockReset();
  });

  describe("createSubscription", () => {
    it("creates a Razorpay customer on first use and returns the subscription id + key id", async () => {
      const prisma = makePrisma();
      mockCustomersCreate.mockResolvedValue({ id: "cust_new" });
      mockSubscriptionsCreate.mockResolvedValue({ id: "sub_new" });
      const service = new BillingService(prisma as never, makeConfig() as never);

      const result = await service.createSubscription("user-1", { plan: "PRO" });

      expect(mockCustomersCreate).toHaveBeenCalledWith({ email: "a@b.com", notes: { userId: "user-1" } });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { razorpayCustomerId: "cust_new" } });
      expect(mockSubscriptionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ plan_id: "plan_pro", notes: { userId: "user-1" } }),
      );
      expect(result).toEqual({ razorpaySubscriptionId: "sub_new", razorpayKeyId: "rzp_test_123", plan: "PRO" });
    });

    it("reuses an existing Razorpay customer instead of creating a new one", async () => {
      const prisma = makePrisma({
        user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.com", razorpayCustomerId: "cust_existing" }) },
      });
      mockSubscriptionsCreate.mockResolvedValue({ id: "sub_new" });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.createSubscription("user-1", { plan: "TEAM" });

      expect(mockCustomersCreate).not.toHaveBeenCalled();
      expect(mockSubscriptionsCreate).toHaveBeenCalledWith(expect.objectContaining({ plan_id: "plan_team" }));
    });

    it("throws ServiceUnavailableException when no plan id is configured", async () => {
      const prisma = makePrisma();
      const service = new BillingService(prisma as never, makeConfig({ RAZORPAY_PLAN_ID_PRO: undefined }) as never);

      await expect(service.createSubscription("user-1", { plan: "PRO" })).rejects.toThrow(ServiceUnavailableException);
    });

    it("throws ServiceUnavailableException when Razorpay isn't configured at all", async () => {
      const prisma = makePrisma();
      const service = new BillingService(prisma as never, makeConfig({ RAZORPAY_KEY_ID: undefined, RAZORPAY_KEY_SECRET: undefined }) as never);

      await expect(service.createSubscription("user-1", { plan: "PRO" })).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe("verifyPayment", () => {
    it("throws BadRequestException on an invalid signature", async () => {
      const prisma = makePrisma();
      const service = new BillingService(prisma as never, makeConfig() as never);

      await expect(
        service.verifyPayment("user-1", {
          razorpay_payment_id: "pay_1",
          razorpay_subscription_id: "sub_1",
          razorpay_signature: "not-the-right-signature",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("syncs plan+subscription on a valid signature", async () => {
      const prisma = makePrisma({
        user: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.com", razorpayCustomerId: "cust_1" }),
          findUnique: jest.fn().mockResolvedValue({ id: "user-1", razorpayCustomerId: "cust_1" }),
        },
        subscription: {
          findUnique: jest.fn().mockResolvedValue({
            plan: "PRO",
            status: "ACTIVE",
            currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
            cancelAtPeriodEnd: false,
          }),
        },
      });
      mockSubscriptionsFetch.mockResolvedValue(fakeSubscriptionEntity());
      const service = new BillingService(prisma as never, makeConfig() as never);
      const signature = signPayment("pay_1", "sub_123");

      const result = await service.verifyPayment("user-1", {
        razorpay_payment_id: "pay_1",
        razorpay_subscription_id: "sub_123",
        razorpay_signature: signature,
      });

      expect(mockSubscriptionsFetch).toHaveBeenCalledWith("sub_123");
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" }, create: expect.objectContaining({ plan: "PRO", status: "ACTIVE" }) }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { plan: "PRO" } });
      expect(result).toEqual({ plan: "PRO", status: "ACTIVE", currentPeriodEnd: "2026-09-01T00:00:00.000Z", cancelAtPeriodEnd: false });
    });
  });

  describe("cancelSubscription", () => {
    it("throws NotFoundException when there's no local subscription row", async () => {
      const prisma = makePrisma();
      const service = new BillingService(prisma as never, makeConfig() as never);

      await expect(service.cancelSubscription("user-1")).rejects.toThrow(NotFoundException);
    });

    it("cancels at cycle end and marks cancelAtPeriodEnd", async () => {
      const prisma = makePrisma({
        subscription: { findUnique: jest.fn().mockResolvedValue({ userId: "user-1", razorpaySubscriptionId: "sub_123" }) },
      });
      const service = new BillingService(prisma as never, makeConfig() as never);

      const result = await service.cancelSubscription("user-1");

      expect(mockSubscriptionsCancel).toHaveBeenCalledWith("sub_123", true);
      expect(prisma.subscription.update).toHaveBeenCalledWith({ where: { userId: "user-1" }, data: { cancelAtPeriodEnd: true } });
      expect(result).toEqual({ cancelled: true });
    });
  });

  describe("getSubscription", () => {
    it("returns null when the user has no subscription row", async () => {
      const prisma = makePrisma();
      const service = new BillingService(prisma as never, makeConfig() as never);

      expect(await service.getSubscription("user-1")).toBeNull();
    });

    it("maps the subscription row to a summary", async () => {
      const prisma = makePrisma({
        subscription: {
          findUnique: jest.fn().mockResolvedValue({
            plan: "PRO",
            status: "ACTIVE",
            currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
            cancelAtPeriodEnd: false,
          }),
        },
      });
      const service = new BillingService(prisma as never, makeConfig() as never);

      expect(await service.getSubscription("user-1")).toEqual({
        plan: "PRO",
        status: "ACTIVE",
        currentPeriodEnd: "2026-09-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
      });
    });
  });

  describe("handleWebhookEvent", () => {
    it("throws BadRequestException on an invalid signature", async () => {
      const prisma = makePrisma();
      const service = new BillingService(prisma as never, makeConfig() as never);

      await expect(service.handleWebhookEvent(Buffer.from("{}"), "bad-sig")).rejects.toThrow(BadRequestException);
    });

    it("throws ServiceUnavailableException when no webhook secret is configured", async () => {
      const prisma = makePrisma();
      const service = new BillingService(prisma as never, makeConfig({ RAZORPAY_WEBHOOK_SECRET: undefined }) as never);

      await expect(service.handleWebhookEvent(Buffer.from("{}"), "sig")).rejects.toThrow(ServiceUnavailableException);
    });

    it("syncs plan+subscription on subscription.activated", async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", razorpayCustomerId: "cust_1" }) },
      });
      const body = JSON.stringify({ event: "subscription.activated", payload: { subscription: { entity: fakeSubscriptionEntity() } } });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.handleWebhookEvent(Buffer.from(body), signWebhook(body));

      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" }, create: expect.objectContaining({ plan: "PRO", status: "ACTIVE" }) }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { plan: "PRO" } });
    });

    it("downgrades to FREE on subscription.cancelled", async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", razorpayCustomerId: "cust_1" }) },
      });
      const body = JSON.stringify({
        event: "subscription.cancelled",
        payload: { subscription: { entity: fakeSubscriptionEntity({ status: "cancelled" }) } },
      });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.handleWebhookEvent(Buffer.from(body), signWebhook(body));

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { plan: "FREE" } });
    });

    it("downgrades to FREE on subscription.halted", async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", razorpayCustomerId: "cust_1" }) },
      });
      const body = JSON.stringify({
        event: "subscription.halted",
        payload: { subscription: { entity: fakeSubscriptionEntity({ status: "halted" }) } },
      });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.handleWebhookEvent(Buffer.from(body), signWebhook(body));

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { plan: "FREE" } });
    });

    it("ignores unrecognized event types without touching the database", async () => {
      const prisma = makePrisma();
      const body = JSON.stringify({ event: "payment.failed", payload: {} });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.handleWebhookEvent(Buffer.from(body), signWebhook(body));

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it("no-ops when the subscription's notes don't map to a known user", async () => {
      const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(null) } });
      const body = JSON.stringify({
        event: "subscription.activated",
        payload: { subscription: { entity: fakeSubscriptionEntity({ notes: { userId: "user-missing" } }) } },
      });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.handleWebhookEvent(Buffer.from(body), signWebhook(body));

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
