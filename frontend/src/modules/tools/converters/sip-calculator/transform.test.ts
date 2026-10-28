import { describe, expect, it } from "vitest";
import { runSip, simulate } from "./transform";

const run = (s: string, o = {}) => runSip(s, { mode: "future-value", yearlyTable: false, ...o });

// Reference values from an independent Python month-by-month loop.
describe("simulate", () => {
  it("plain SIP", () => {
    const r = simulate(10000, 12, 10, 0, 0);
    expect(r.balance).toBeCloseTo(2323390.7635, 3);
    expect(r.invested).toBe(1_200_000);
  });
  it("step-up", () => {
    const r = simulate(10000, 12, 10, 10, 0);
    expect(r.balance).toBeCloseTo(3374326.2642, 3);
    expect(r.invested).toBeCloseTo(1912490.95, 2);
  });
  it("yearly rows", () => {
    expect(simulate(10000, 12, 3, 0, 0).rows.map((x) => Math.round(x.value))).toEqual([128093, 272432, 435076]);
  });
});

describe("runSip", () => {
  it("formats with Indian grouping", () => {
    const o = run("monthly: 10000\nrate: 12\nyears: 10").output;
    expect(o).toContain("Total invested        12,00,000");
    expect(o).toContain("Future value          23,23,391");
    expect(o).toContain("Estimated returns     11,23,391");
  });
  it("lump sum is added", () => {
    const o = run("monthly: 5000\nrate: 10\nyears: 5\nlump: 100000").output;
    expect(o).toContain("Total invested        4,00,000");
    expect(o).toContain("Future value          5,54,943");
  });
  it("inflation adjusted value", () => {
    expect(run("monthly: 10000\nrate: 12\nyears: 10\ninflation: 6").output).toContain("In today's money      12,97,369");
  });
  it("required SIP for a goal, with and without step-up", () => {
    expect(run("target: 5000000\nrate: 12\nyears: 10", { mode: "required-sip" }).output).toContain("Required monthly SIP   21,520");
    expect(run("target: 10000000\nrate: 12\nyears: 20\nstepup: 10", { mode: "required-sip" }).output).toContain("Required monthly SIP   5,028");
  });
  it("lump sum already meets goal", () => {
    expect(run("target: 1000\nrate: 10\nyears: 5\nlump: 100000", { mode: "required-sip" }).output).toMatch(/already meets/);
  });
  it("yearly table", () => {
    const o = run("monthly: 10000\nrate: 12\nyears: 3", { yearlyTable: true }).output;
    expect(o).toMatch(/\n\s+1\s+1,20,000\s+1,28,093\n/);
  });
  it("validation", () => {
    expect(run("monthly: 1\nrate: 12").error?.message).toMatch(/years/);
    expect(run("monthly: 1\nyears: 5").error?.message).toMatch(/rate/);
    expect(run("rate: 12\nyears: 5").error?.message).toMatch(/monthly/);
    expect(run("monthly: 1\nrate: 12\nyears: 5.5").error).not.toBeNull();
    expect(run("")).toEqual({ output: "", error: null });
  });
});
