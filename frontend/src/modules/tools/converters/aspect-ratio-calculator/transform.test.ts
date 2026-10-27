import { describe, expect, it } from "vitest";
import { calcAspectRatio, nearestCommon, simplify } from "./transform";

const o = { targetWidth: 0, targetHeight: 0 };

describe("aspect ratio", () => {
  it("simplifies with the GCD", () => {
    expect(simplify(1920, 1080)).toEqual([16, 9]);
    expect(simplify(1024, 768)).toEqual([4, 3]);
    expect(simplify(7, 5)).toEqual([7, 5]);
  });
  it("snaps near-matches to a common ratio (1366x768 is ~16:9)", () => {
    expect(nearestCommon(1366, 768)).toBe("16:9");
    expect(nearestCommon(1000, 777)).toBeNull();
  });
  it("describes 1920x1080", () => {
    const out = calcAspectRatio("1920x1080", o).output;
    expect(out).toContain("ratio      16:9");
    expect(out).toContain("decimal    1.7778");
    expect(out).toContain("56.25%");
  });
  it("annotates awkward exact ratios with the nearest common one", () => {
    expect(calcAspectRatio("1366x768", o).output).toContain("683:384  (≈ 16:9)");
  });
  it("scales to a target width and height", () => {
    const out = calcAspectRatio("16:9", { targetWidth: 800, targetHeight: 450 }).output;
    expect(out).toContain("at width 800  → height 450");
    expect(out).toContain("at height 450 → width 800");
  });
  it("accepts × and decimals, rejects junk with a line number", () => {
    expect(calcAspectRatio("1.5×1", o).output).toContain("≈ 3:2");
    expect(calcAspectRatio("1x1\nfoo", o).error?.line).toBe(2);
    expect(calcAspectRatio("0x5", o).error).not.toBeNull();
    expect(calcAspectRatio("", o)).toEqual({ output: "", error: null });
  });
});
