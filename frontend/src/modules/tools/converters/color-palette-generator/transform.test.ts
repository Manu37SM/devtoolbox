import { describe, expect, it } from "vitest";
import { generatePalette } from "./transform";
import type { ColorPaletteGeneratorOptions } from "./schema";

const base: ColorPaletteGeneratorOptions = { scheme: "monochromatic", count: 5 };

describe("generatePalette", () => {
  it("errors on an invalid hex color", () => {
    const result = generatePalette("not-a-color", base);
    expect(result.error).not.toBeNull();
    expect(result.colors).toEqual([]);
  });

  it("accepts 3-digit and 6-digit hex, with or without #", () => {
    expect(generatePalette("f00", base).error).toBeNull();
    expect(generatePalette("#f00", base).error).toBeNull();
    expect(generatePalette("ff0000", base).error).toBeNull();
    expect(generatePalette("#ff0000", base).error).toBeNull();
  });

  it("generates `count` colors for monochromatic/shades, same hue and saturation", () => {
    const result = generatePalette("#ff0000", { scheme: "monochromatic", count: 5 });
    expect(result.colors).toHaveLength(5);
    expect(result.colors.every((c) => c.h === 0)).toBe(true);
    expect(result.colors.every((c) => c.s === 100)).toBe(true);

    const lightnesses = result.colors.map((c) => c.l);
    expect(lightnesses).toEqual([...lightnesses].sort((a, b) => a - b));
    expect(new Set(lightnesses).size).toBe(5);
  });

  it("generates a complementary pair 180° apart", () => {
    const result = generatePalette("#ff0000", { scheme: "complementary", count: 2 });
    expect(result.colors).toHaveLength(2);
    expect(result.colors[0]?.h).toBe(0);
    expect(result.colors[1]?.h).toBe(180);
  });

  it("generates analogous hues stepped ±30° from the base", () => {
    const result = generatePalette("#ff0000", { scheme: "analogous", count: 3 });
    expect(result.colors.map((c) => c.h)).toEqual([0, 30, 330]);
  });

  it("generates triadic hues 120° apart", () => {
    const result = generatePalette("#ff0000", { scheme: "triadic", count: 3 });
    expect(result.colors.map((c) => c.h)).toEqual([0, 120, 240]);
  });

  it("generates tetradic hues 90° apart", () => {
    const result = generatePalette("#ff0000", { scheme: "tetradic", count: 4 });
    expect(result.colors.map((c) => c.h)).toEqual([0, 90, 180, 270]);
  });

  it("clamps count to the 2-10 range", () => {
    const tooFew = generatePalette("#ff0000", { scheme: "shades", count: 1 });
    expect(tooFew.colors).toHaveLength(2);
    const tooMany = generatePalette("#ff0000", { scheme: "shades", count: 20 });
    expect(tooMany.colors).toHaveLength(10);
  });

  it("produces a newline-separated hex list as output matching the swatches", () => {
    const result = generatePalette("#ff0000", { scheme: "monochromatic", count: 3 });
    expect(result.output).toBe(result.colors.map((c) => c.hex).join("\n"));
    expect(result.output.split("\n")).toHaveLength(3);
  });

  it("produces valid 6-digit hex codes for every swatch", () => {
    const result = generatePalette("#3366ff", { scheme: "tetradic", count: 4 });
    for (const c of result.colors) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
