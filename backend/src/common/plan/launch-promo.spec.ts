import { isLaunchPromoActive, promoAppliesToRoute } from "./launch-promo";

describe("isLaunchPromoActive", () => {
  const now = new Date("2026-11-01T00:00:00Z");

  it("is off when unset or empty", () => {
    expect(isLaunchPromoActive(undefined, now)).toBe(false);
    expect(isLaunchPromoActive("", now)).toBe(false);
  });

  it("is off for an unparseable date (fails closed)", () => {
    expect(isLaunchPromoActive("next tuesday", now)).toBe(false);
  });

  it("is on before the end instant and off at or after it", () => {
    expect(isLaunchPromoActive("2026-12-31T23:59:59Z", now)).toBe(true);
    expect(isLaunchPromoActive("2026-11-01T00:00:00Z", now)).toBe(false);
    expect(isLaunchPromoActive("2026-10-01T00:00:00Z", now)).toBe(false);
  });
});

describe("promoAppliesToRoute", () => {
  it("covers only AI routes", () => {
    expect(promoAppliesToRoute("ai-explain")).toBe(true);
    expect(promoAppliesToRoute("net-http-test")).toBe(false);
  });
});
