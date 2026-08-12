import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { BillingService } from "../billing/billing.service";

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.com", deletedAt: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    session: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    ...overrides,
  } as unknown as import("../../database/prisma.service").PrismaService;
}

function makeBilling(overrides: Partial<Record<keyof BillingService, jest.Mock>> = {}) {
  return {
    cancelSubscription: jest.fn().mockResolvedValue({ cancelled: true }),
    ...overrides,
  } as unknown as BillingService;
}

describe("UsersService", () => {
  describe("softDelete", () => {
    it("cancels the underlying Razorpay subscription before soft-deleting", async () => {
      const prisma = makePrisma();
      const billing = makeBilling();
      const service = new UsersService(prisma, billing);

      await service.softDelete("user-1");

      expect(billing.cancelSubscription).toHaveBeenCalledWith("user-1");
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("still soft-deletes a user with no active subscription (NotFoundException swallowed)", async () => {
      const prisma = makePrisma();
      const billing = makeBilling({ cancelSubscription: jest.fn().mockRejectedValue(new NotFoundException()) });
      const service = new UsersService(prisma, billing);

      await expect(service.softDelete("user-1")).resolves.toBeUndefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("still soft-deletes when billing isn't configured on this server (ServiceUnavailableException swallowed)", async () => {
      const prisma = makePrisma();
      const billing = makeBilling({ cancelSubscription: jest.fn().mockRejectedValue(new ServiceUnavailableException()) });
      const service = new UsersService(prisma, billing);

      await expect(service.softDelete("user-1")).resolves.toBeUndefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("does not soft-delete if cancellation fails for an unexpected reason", async () => {
      const prisma = makePrisma();
      const billing = makeBilling({ cancelSubscription: jest.fn().mockRejectedValue(new Error("Razorpay is down")) });
      const service = new UsersService(prisma, billing);

      await expect(service.softDelete("user-1")).rejects.toThrow("Razorpay is down");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects deleting an already-deleted account", async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", deletedAt: new Date() }) },
      });
      const billing = makeBilling();
      const service = new UsersService(prisma, billing);

      await expect(service.softDelete("user-1")).rejects.toThrow(NotFoundException);
      expect(billing.cancelSubscription).not.toHaveBeenCalled();
    });
  });
});
