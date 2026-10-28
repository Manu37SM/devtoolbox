import { describe, expect, it } from "vitest";
import { calculateStatistics, describeData, modes, percentile } from "./transform";

describe("describeData", () => {
  it("matches textbook values", () => {
    const s = describeData([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.mean).toBe(5);
    expect(s.popSd).toBe(2);
    expect(s.sampVar).toBeCloseTo(32 / 7, 12);
    expect(s.median).toBe(4.5);
    expect(s.modes).toEqual([4]);
    expect(s.sem).toBeCloseTo(Math.sqrt(32 / 7) / Math.sqrt(8), 12);
  });
  it("computes quartiles like NumPy (linear interpolation)", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(sorted, 25)).toBe(3.25);
    expect(percentile(sorted, 75)).toBe(7.75);
    expect(percentile(sorted, 90)).toBeCloseTo(9.1, 12);
    expect(percentile([5], 99)).toBe(5);
  });
  it("detects outliers and means of positive data", () => {
    const s = describeData([1, 2, 3, 4, 100]);
    expect(s.outliers).toEqual([100]);
    expect(s.geo).toBeCloseTo(Math.pow(1 * 2 * 3 * 4 * 100, 1 / 5), 12);
    expect(describeData([1, 2, 4]).harm).toBeCloseTo(3 / (1 + 0.5 + 0.25), 12);
    expect(describeData([-1, 2]).geo).toBeNaN();
  });
  it("modes: multimodal and none", () => {
    expect(modes([1, 1, 2, 2, 3])).toEqual([1, 2]);
    expect(modes([1, 2, 3])).toEqual([]);
  });
});

describe("calculateStatistics", () => {
  it("formats a table and handles bad input", () => {
    const r = calculateStatistics("2, 4 4 4\n5 5 7 9", { decimals: 2, percentile: 90 });
    expect(r.output).toContain("Mean                        5");
    expect(r.output).toContain("P90");
    expect(calculateStatistics("1 x", { decimals: 2, percentile: 90 }).error?.message).toContain('"x"');
    expect(calculateStatistics("5", { decimals: 2, percentile: 90 }).output).toContain("Variance (sample)           n/a");
  });
});
