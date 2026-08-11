import { BadRequestException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { BillingService } from "./billing.service";

const mockCheckoutCreate = jest.fn();
const mockPortalCreate = jest.fn();
const mockCustomersCreate = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock("stripe", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      checkout: { sessions: { create: mockCheckoutCreate } },
      billingPortal: { sessions: { create: mockPortalCreate } },
      customers: { create: mockCustomersCreate },
      subscriptions: { retrieve: mockSubscriptionsRetrieve },
      webhooks: { constructEvent: mockConstructEvent },
    })),
  };
});

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_123",
    STRIPE_PRICE_ID_PRO: "price_pro",
    STRIPE_PRICE_ID_TEAM: "price_team",
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
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.com", stripeCustomerId: null }),
      findUnique: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.com" }),
      update: jest.fn().mockResolvedValue({}),
      ...overrides.user,
    },
    subscription: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      ...overrides.subscription,
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
}

function fakeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    cancel_at_period_end: false,
    current_period_end: 1_800_000_000,
    items: { data: [{ price: { id: "price_pro" } }] },
    ...overrides,
  };
}

describe("BillingService", () => {
  beforeEach(() => {
    mockCheckoutCreate.mockReset();
    mockPortalCreate.mockReset();
    mockCustomersCreate.mockReset();
    mockSubscriptionsRetrieve.mockReset();
    mockConstructEvent.mockReset();
  });

  describe("createCheckoutSession", () => {
    it("creates a Stripe customer on first use and returns the checkout URL", async () => {
      const prisma = makePrisma();
      mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
      mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test_abc" });
      const service = new BillingService(prisma as never, makeConfig() as never);

      const result = await service.createCheckoutSession("user-1", { plan: "PRO" });

      expect(mockCustomersCreate).toHaveBeenCalledWith({ email: "a@b.com", metadata: { userId: "user-1" } });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { stripeCustomerId: "cus_new" } });
      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "subscription", customer: "cus_new", client_reference_id: "user-1" }),
      );
      expect(result.url).toBe("https://checkout.stripe.com/c/pay/cs_test_abc");
    });

    it("reuses an existing Stripe customer instead of creating a new one", async () => {
      const prisma = makePrisma({
        user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.com", stripeCustomerId: "cus_existing" }) },
      });
      mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test_xyz" });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.createCheckoutSession("user-1", { plan: "TEAM" });

      expect(mockCustomersCreate).not.toHaveBeenCalled();
      expect(mockCheckoutCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_existing" }));
    });

    it("throws ServiceUnavailableException when no plan price ID is configured", async () => {
      const prisma = makePrisma();
      const service = new BillingService(prisma as never, makeConfig({ STRIPE_PRICE_ID_PRO: undefined }) as never);

      await expect(service.createCheckoutSession("user-1", { plan: "PRO" })).rejects.toThrow(ServiceUnavailableException);
    });

    it("throws ServiceUnavailableException when Stripe isn't configured at all", async () => {
      const prisma = makePrisma();
      const service = new BillingService(prisma as never, makeConfig({ STRIPE_SECRET_KEY: undefined }) as never);

      await expect(service.createCheckoutSession("user-1", { plan: "PRO" })).rejects.toThrow(ServiceUnavailableException);
    });

    it("throws BadRequestException if Stripe doesn't return a checkout URL", async () => {
      const prisma = makePrisma({
        user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.com", stripeCustomerId: "cus_1" }) },
      });
      mockCheckoutCreate.mockResolvedValue({ url: null });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await expect(service.createCheckoutSession("user-1", { plan: "PRO" })).rejects.toThrow(BadRequestException);
    });
  });

  describe("createPortalSession", () => {
    it("throws NotFoundException when the user has no Stripe customer yet", async () => {
      const prisma = makePrisma({ user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", stripeCustomerId: null }) } });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await expect(service.createPortalSession("user-1")).rejects.toThrow(NotFoundException);
    });

    it("returns the portal URL for an existing customer", async () => {
      const prisma = makePrisma({
        user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", stripeCustomerId: "cus_1" }) },
      });
      mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/session_abc" });
      const service = new BillingService(prisma as never, makeConfig() as never);

      const result = await service.createPortalSession("user-1");

      expect(mockPortalCreate).toHaveBeenCalledWith({ customer: "cus_1", return_url: "https://devtoolbox.dev/account" });
      expect(result.url).toBe("https://billing.stripe.com/p/session_abc");
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
      mockConstructEvent.mockImplementation(() => {
        throw new Error("bad signature");
      });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await expect(service.handleWebhookEvent(Buffer.from("{}"), "bad-sig")).rejects.toThrow(BadRequestException);
    });

    it("throws ServiceUnavailableException when no webhook secret is configured", async () => {
      const prisma = makePrisma();
      const service = new BillingService(prisma as never, makeConfig({ STRIPE_WEBHOOK_SECRET: undefined }) as never);

      await expect(service.handleWebhookEvent(Buffer.from("{}"), "sig")).rejects.toThrow(ServiceUnavailableException);
    });

    it("syncs plan+subscription on checkout.session.completed", async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1" }) },
      });
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: { object: { subscription: "sub_123", customer: "cus_123" } },
      });
      mockSubscriptionsRetrieve.mockResolvedValue(fakeSubscription());
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.handleWebhookEvent(Buffer.from("{}"), "sig");

      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          create: expect.objectContaining({ plan: "PRO", status: "ACTIVE" }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { plan: "PRO" } });
    });

    it("downgrades to FREE on customer.subscription.deleted", async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1" }) },
      });
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.deleted",
        data: { object: fakeSubscription({ status: "canceled" }) },
      });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.handleWebhookEvent(Buffer.from("{}"), "sig");

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { plan: "FREE" } });
    });

    it("downgrades to FREE on customer.subscription.updated with status past_due", async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1" }) },
      });
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: { object: fakeSubscription({ status: "past_due" }) },
      });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.handleWebhookEvent(Buffer.from("{}"), "sig");

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { plan: "FREE" } });
    });

    it("ignores unrecognized event types without touching the database", async () => {
      const prisma = makePrisma();
      mockConstructEvent.mockReturnValue({ type: "invoice.paid", data: { object: {} } });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.handleWebhookEvent(Buffer.from("{}"), "sig");

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it("no-ops when the Stripe customer isn't linked to any known user", async () => {
      const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(null) } });
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: { object: fakeSubscription() },
      });
      const service = new BillingService(prisma as never, makeConfig() as never);

      await service.handleWebhookEvent(Buffer.from("{}"), "sig");

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
