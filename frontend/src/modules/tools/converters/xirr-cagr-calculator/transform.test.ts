import { describe, expect, it } from "vitest";
import { parseDate, runXirrCagrCalculator, xirr } from "./transform";

describe("xirr", () => {
  it("matches Excel's documented example (0.373362535)", () => {
    const flows = [["2008-01-01", -10000], ["2008-03-01", 2750], ["2008-10-30", 4250], ["2009-02-15", 3250], ["2009-04-01", 2750]] as const;
    expect(xirr(flows.map(([d, a]) => ({ date: parseDate(d)!, amount: a })))).toBeCloseTo(0.3733625335, 8);
  });
  it("handles a monthly SIP (Python bisection: 15.655%)", () => {
    const flows = Array.from({ length: 12 }, (_, i) => ({ date: new Date(Date.UTC(2024, i, 1)), amount: -5000 }));
    flows.push({ date: new Date(Date.UTC(2025, 0, 1)), amount: 65000 });
    expect(xirr(flows)).toBeCloseTo(0.1565516961, 7);
  });
  it("handles losses", () => {
    expect(xirr([{ date: new Date(Date.UTC(2020, 0, 1)), amount: -100 }, { date: new Date(Date.UTC(2021, 0, 1)), amount: 50 }])).toBeCloseTo(-0.5, 2);
  });
});

describe("runXirrCagrCalculator", () => {
  it("parses dates in either order and Indian-format amounts", () => {
    expect(parseDate("31/01/2024")!.toISOString()).toBe("2024-01-31T00:00:00.000Z");
    expect(parseDate("2024-02-30")).toBeNull();
    const out = runXirrCagrCalculator("01/01/2024 -1,00,000\n01/01/2025 1,10,000", { mode: "xirr" }).output;
    expect(out).toContain("XIRR: 9.97% per year");
    expect(out).toContain("Invested: 100,000");
  });
  it("computes CAGR from years or dates", () => {
    expect(runXirrCagrCalculator("start: 100000\nend: 200000\nyears: 5", { mode: "cagr" }).output).toContain("CAGR: 14.87% per year");
    expect(runXirrCagrCalculator("start: 100\nend: 121\nfrom: 2020-01-01\nto: 2022-01-01", { mode: "cagr" }).output).toContain("CAGR: 9.99% per year");
  });
  it("validates inputs", () => {
    expect(runXirrCagrCalculator("2024-01-01 100", { mode: "xirr" }).error?.message).toContain("at least one negative");
    expect(runXirrCagrCalculator("yesterday 5", { mode: "xirr" }).error?.message).toContain("<date> <amount>");
    expect(runXirrCagrCalculator("start: 0\nend: 5\nyears: 1", { mode: "cagr" }).error?.message).toContain("positive");
  });
});
