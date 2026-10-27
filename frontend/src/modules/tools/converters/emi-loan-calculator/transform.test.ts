import { describe, expect, it } from "vitest";
import { calcEmi, emi } from "./transform";

const base = { principal: 1_000_000, rate: 8.5, tenure: 20, tenureUnit: "years", schedule: false } as const;

describe("emi", () => {
  it("matches the standard formula (10L @ 8.5% for 20y ≈ 8678)", () => {
    expect(emi(1_000_000, 8.5, 240)).toBeCloseTo(8678.23, 1);
  });
  it("handles zero interest", () => {
    expect(emi(120_000, 0, 12)).toBe(10_000);
  });
  it("is the principal for a one month loan plus one month interest", () => {
    expect(emi(1000, 12, 1)).toBeCloseTo(1010, 8);
  });
});

describe("calcEmi", () => {
  it("summarises EMI, interest and total", () => {
    const out = calcEmi("", base).output;
    expect(out).toContain("Monthly EMI       8,678.23");
    expect(out).toMatch(/Total payment     2,082,7\d\d\.\d\d/);
  });
  it("accepts months and a full schedule that ends at zero balance", () => {
    const out = calcEmi("", { ...base, principal: 12_000, rate: 12, tenure: 12, tenureUnit: "months", schedule: true }).output;
    const rows = out.split("\n").filter((l) => /^\s+\d+\s/.test(l));
    expect(rows).toHaveLength(12);
    expect(rows[0]).toContain("120.00"); // month-1 interest = 12000 * 1%
    expect(rows[11]!.trim().endsWith("0.00")).toBe(true);
  });
  it("validates ranges", () => {
    expect(calcEmi("", { ...base, principal: 0 }).error).not.toBeNull();
    expect(calcEmi("", { ...base, tenure: 0 }).error).not.toBeNull();
    expect(calcEmi("", { ...base, tenure: 100 }).error).not.toBeNull();
    expect(calcEmi("", { ...base, rate: -1 }).error).not.toBeNull();
  });
});
