import type { PrismaService } from "../../database/prisma.service";

export async function resolveEffectivePlan(
  prisma: PrismaService,
  userId: string,
  ownPlan: "FREE" | "PRO" | "TEAM",
): Promise<"FREE" | "PRO" | "TEAM"> {

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
