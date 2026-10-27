import { describe, expect, it } from "vitest";
import { calcCompound, futureValue } from "./transform";

const base = { principal: 10_000, rate: 10, years: 1, compounding: "1", monthly: 0, yearly: false } as const;

describe("futureValue", () => {
  it("annual compounding: 10k @10% for 1y = 11,000", () => {
    expect(futureValue(10_000, 10, 1, 1, 0).value).toBeCloseTo(11_000, 6);
  });
  it("monthly compounding gives 11,047.13", () => {
    expect(futureValue(10_000, 10, 1, 12, 0).value).toBeCloseTo(11_047.13, 2);
  });
  it("matches the closed form over many years", () => {
    expect(futureValue(10_000, 7, 30, 1, 0).value).toBeCloseTo(10_000 * 1.07 ** 30, 4);
  });
  it("SIP: 5,000/month @12% (monthly) for 1y = 63,412.52", () => {
    const r = futureValue(0, 12, 1, 12, 5_000);
    expect(r.value).toBeCloseTo(63_412.52, 1);
    expect(r.invested).toBe(60_000);
  });
  it("zero rate just sums the contributions", () => {
    expect(futureValue(1000, 0, 2, 12, 100).value).toBeCloseTo(3400, 8);
  });
});

describe("calcCompound", () => {
  it("formats the summary and effective yield", () => {
    const out = calcCompound("", { ...base, compounding: "12" }).output;
    expect(out).toContain("Final value     11,047.13");
    expect(out).toContain("Effective annual yield  10.4713%");
  });
  it("lists yearly balances when asked", () => {
    const out = calcCompound("", { ...base, years: 3, yearly: true }).output;
    expect(out).toContain("   3   13,310.00");
  });
  it("validates inputs", () => {
    expect(calcCompound("", { ...base, principal: 0 }).error).not.toBeNull();
    expect(calcCompound("", { ...base, years: 0 }).error).not.toBeNull();
    expect(calcCompound("", { ...base, rate: 150 }).error).not.toBeNull();
    expect(calcCompound("", { ...base, principal: -1 }).error).not.toBeNull();
  });
});
