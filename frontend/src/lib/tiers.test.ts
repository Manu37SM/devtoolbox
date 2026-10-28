import { describe, expect, it } from "vitest";
import { AI_HOURLY_LIMITS, TIERS, isAiTool, isLaunchPromoActive } from "@/lib/tiers";
import { toolRegistry } from "@/lib/registry";

describe("isLaunchPromoActive", () => {
  const now = new Date("2026-11-01T00:00:00Z");
  it("fails closed", () => {
    expect(isLaunchPromoActive(undefined, now)).toBe(false);
    expect(isLaunchPromoActive("garbage", now)).toBe(false);
  });
  it("is active only before the end instant", () => {
    expect(isLaunchPromoActive("2026-12-01T00:00:00Z", now)).toBe(true);
    expect(isLaunchPromoActive("2026-11-01T00:00:00Z", now)).toBe(false);
  });
});

describe("tiers", () => {
  it("AI limits increase with tier", () => {
    expect(AI_HOURLY_LIMITS.anonymous).toBeLessThan(AI_HOURLY_LIMITS.free);
    expect(AI_HOURLY_LIMITS.free).toBeLessThan(AI_HOURLY_LIMITS.pro);
  });
  it("lists free, pro and team once each", () => {
    expect(TIERS.map((t) => t.id)).toEqual(["free", "pro", "team"]);
  });
  it("flags exactly the ai-module tools", () => {
    const ai = toolRegistry.filter(isAiTool);
    expect(ai.length).toBeGreaterThan(0);
    expect(ai.every((t) => t.module === "ai")).toBe(true);
  });
});
