import { describe, expect, it } from "vitest";
import { calcGst, splitGst } from "./transform";

const o = { rate: "18", mode: "exclusive", intraState: true } as const;

describe("splitGst", () => {
  it("adds GST on top", () => {
    expect(splitGst(1000, 18, false)).toEqual({ base: 1000, gst: 180, total: 1180 });
  });
  it("backs GST out of a GST-inclusive price", () => {
    expect(splitGst(1180, 18, true)).toEqual({ base: 1000, gst: 180, total: 1180 });
    expect(splitGst(999, 12, true)).toEqual({ base: 891.96, gst: 107.04, total: 999 });
  });
  it("handles the 0.25% and 0% slabs", () => {
    expect(splitGst(10000, 0.25, false).gst).toBe(25);
    expect(splitGst(500, 0, false)).toEqual({ base: 500, gst: 0, total: 500 });
  });
});

describe("calcGst", () => {
  it("splits intra-state tax into CGST and SGST that sum to the GST", () => {
    const out = calcGst("1000", o).output;
    expect(out).toContain("CGST 9%      90.00");
    expect(out).toContain("SGST 9%      90.00");
    expect(out).toContain("Total           1,180.00");
  });
  it("never loses a paisa on odd splits", () => {
    const out = calcGst("0.15", { ...o, rate: "5" }).output; // gst 0.0075 -> 0.01 -> 0.01/2
    expect(out).toContain("CGST 2.5%");
    const gstLine = (n: string) => Number(new RegExp(`${n} [\\d.]+%\\s+([\\d.,]+)`).exec(out)![1]!.replace(/,/g, ""));
    expect(gstLine("CGST") + gstLine("SGST")).toBeCloseTo(0.01, 8);
  });
  it("uses IGST for inter-state supplies and Indian grouping", () => {
    const out = calcGst("₹1,00,000", { ...o, intraState: false, rate: "28" }).output;
    expect(out).toContain("IGST 28%");
    expect(out).toContain("1,28,000.00");
  });
  it("supports inclusive mode and validates lines", () => {
    expect(calcGst("1180", { ...o, mode: "inclusive" }).output).toContain("Taxable value   1,000.00");
    expect(calcGst("100\nabc", o).error?.line).toBe(2);
    expect(calcGst("-5", o).error).not.toBeNull();
    expect(calcGst("", o)).toEqual({ output: "", error: null });
  });
});
