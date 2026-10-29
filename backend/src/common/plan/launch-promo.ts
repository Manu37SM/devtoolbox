/**
 * Launch promo: until LAUNCH_PROMO_UNTIL (an ISO-8601 instant), signed-in FREE
 * users get PRO-level limits on AI routes. It only affects rate-limit tier
 * selection. It never changes a user's stored plan, billing state, API-key
 * entitlement or any other feature gate.
 *
 * Fails closed: a missing, unparseable or past date means the promo is off.
 */
export function isLaunchPromoActive(until: string | undefined, now: Date = new Date()): boolean {
  if (!until) return false;
  const end = Date.parse(until);
  if (Number.isNaN(end)) return false;
  return now.getTime() < end;
}

export const PROMO_ROUTE_PREFIX = "ai-";

export function promoAppliesToRoute(route: string): boolean {
  return route.startsWith(PROMO_ROUTE_PREFIX);
}
