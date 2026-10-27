import { describe, expect, it } from "vitest";
import { generateClamp } from "./transform";

const base = { minSize: 16, maxSize: 24, minViewport: 320, maxViewport: 1280, unit: "rem", rootPx: 16 } as const;
const first = (o: Parameters<typeof generateClamp>[1]) => generateClamp("", o).output.split("\n")[0];

describe("generateClamp", () => {
  it("produces the standard fluid-type formula in rem", () => {
    // slope = 8/960 = 0.8333vw ; intercept = 16 - 0.008333*320 = 13.3333px = 0.8333rem
    expect(first(base)).toBe("font-size: clamp(1rem, 0.8333rem + 0.8333vw, 1.5rem);");
  });
  it("supports px output", () => {
    expect(first({ ...base, unit: "px" })).toBe("font-size: clamp(16px, 13.3333px + 0.8333vw, 24px);");
  });
  it("renders a negative intercept with a minus sign", () => {
    // 16px@320 -> 48px@1280 : slope 3.3333vw, intercept 16-10.667 = 5.333 ; use 10px@500 -> 30px@1000: slope 4vw, intercept -10
    expect(first({ ...base, unit: "px", minSize: 10, maxSize: 30, minViewport: 500, maxViewport: 1000 })).toBe("font-size: clamp(10px, -10px + 4vw, 30px);");
  });
  it("handles a zero intercept", () => {
    expect(first({ ...base, unit: "px", minSize: 10, maxSize: 20, minViewport: 100, maxViewport: 200 })).toBe("font-size: clamp(10px, 10vw, 20px);");
  });
  it("orders clamp bounds when sizes shrink as the viewport grows", () => {
    expect(first({ ...base, unit: "px", minSize: 24, maxSize: 16 })).toMatch(/^font-size: clamp\(16px, .*, 24px\);$/);
  });
  it("respects a custom root font size", () => {
    expect(first({ ...base, rootPx: 10, minSize: 20, maxSize: 20 })).toContain("clamp(2rem,");
  });
  it("rejects an inverted viewport range", () => {
    expect(generateClamp("", { ...base, maxViewport: 320 }).error).not.toBeNull();
  });
});
