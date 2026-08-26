import { describe, expect, it } from "vitest";
import { generateBoxShadowBorderRadiusCss, hexToRgba } from "./transform";
import type { BoxShadowBorderRadiusOptions } from "./schema";

const base: BoxShadowBorderRadiusOptions = {
  offsetX: 0,
  offsetY: 4,
  blur: 12,
  spread: 0,
  color: "#000000",
  opacity: 20,
  inset: false,
  borderRadius: 12,
};

describe("hexToRgba", () => {
  it("converts a 6-digit hex + opacity to rgba", () => {
    expect(hexToRgba("#ff0000", 50)).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("expands a 3-digit hex", () => {
    expect(hexToRgba("#f00", 100)).toBe("rgba(255, 0, 0, 1)");
  });

  it("clamps opacity to 0-100", () => {
    expect(hexToRgba("#000000", 150)).toBe("rgba(0, 0, 0, 1)");
    expect(hexToRgba("#000000", -10)).toBe("rgba(0, 0, 0, 0)");
  });
});

describe("generateBoxShadowBorderRadiusCss", () => {
  it("generates box-shadow and border-radius CSS", () => {
    const result = generateBoxShadowBorderRadiusCss(base);
    expect(result.error).toBeNull();
    expect(result.output).toBe("box-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.2);\nborder-radius: 12px;");
  });

  it("prefixes inset when enabled", () => {
    const result = generateBoxShadowBorderRadiusCss({ ...base, inset: true });
    expect(result.output).toContain("box-shadow: inset 0px 4px 12px 0px");
  });

  it("supports negative offsets and spread", () => {
    const result = generateBoxShadowBorderRadiusCss({ ...base, offsetX: -10, offsetY: -5, spread: -2 });
    expect(result.output).toContain("-10px -5px 12px -2px");
  });

  it("errors on an invalid hex color", () => {
    const result = generateBoxShadowBorderRadiusCss({ ...base, color: "not-a-color" });
    expect(result.error).not.toBeNull();
    expect(result.output).toBe("");
  });

  it("errors on a negative border radius", () => {
    const result = generateBoxShadowBorderRadiusCss({ ...base, borderRadius: -5 });
    expect(result.error).not.toBeNull();
  });

  it("accepts a 3-digit hex color", () => {
    const result = generateBoxShadowBorderRadiusCss({ ...base, color: "#0f0" });
    expect(result.error).toBeNull();
  });
});
