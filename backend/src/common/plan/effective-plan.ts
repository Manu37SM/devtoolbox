import type { PrismaService } from "../../database/prisma.service";

/**
 * A user's *effective* plan for rate-limiting/quota purposes: their own
 * `User.plan`, OR TEAM if they're a member of an organization whose OWNER
 * personally holds a TEAM plan (API.md §17, DATABASE.md's Organization
 * note). There is no separate org-level Stripe subscription in this pass —
 * an org "goes TEAM" purely because its owner subscribed via the existing
 * personal billing flow (§9). This keeps `User.plan` the single source of
 * truth billing writes to, while still fulfilling the "org-level AI quotas"
 * promise from ARCHITECTURE.md §14.2 for every member, not just the owner.
 *
 * Deliberately NOT used for `/billing/*` itself (a user's own plan there is
 * always their own, never inherited) — only for the two consumption-side
 * gates that ARCHITECTURE.md's monetization section actually promises team
 * benefits for: `PlanThrottleGuard`'s rate-limit tier and the Public API's
 * PRO/TEAM gate (`ApiKeysService.validateKey`).
 */
export async function resolveEffectivePlan(
  prisma: PrismaService,
  userId: string,
  ownPlan: "FREE" | "PRO" | "TEAM",
): Promise<"FREE" | "PRO" | "TEAM"> {
  // Only FREE needs the lookup — PRO/TEAM already get the top rate-limit
  // tier ("pro", which both PRO and TEAM share) from their own plan.
  if (ownPlan !== "FREE") return ownPlan;

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organization: {
        members: { some: { role: "OWNER", user: { plan: "TEAM" } } },
      },
    },
    select: { id: true },
  });

  return membership ? "TEAM" : ownPlan;
}
