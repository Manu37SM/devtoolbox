import { describe, expect, it } from "vitest";
import { convertColor } from "./transform";

describe("convertColor", () => {
  it("parses 6-digit hex and converts to rgb/hsl/cmyk", () => {
    const result = convertColor("#ff0000");
    expect(result.rgb).toBe("rgb(255, 0, 0)");
    expect(result.hsl).toBe("hsl(0, 100%, 50%)");
    expect(result.cmyk).toBe("cmyk(0%, 100%, 100%, 0%)");
  });

  it("parses 3-digit hex shorthand", () => {
    const result = convertColor("#0f0");
    expect(result.hex).toBe("#00ff00");
  });

  it("parses rgb() input", () => {
    const result = convertColor("rgb(0, 0, 255)");
    expect(result.hex).toBe("#0000ff");
  });

  it("parses hsl() input", () => {
    const result = convertColor("hsl(0, 100%, 50%)");
    expect(result.hex).toBe("#ff0000");
  });

  it("handles black correctly for cmyk (avoids divide by zero)", () => {
    const result = convertColor("#000000");
    expect(result.cmyk).toBe("cmyk(0%, 0%, 0%, 100%)");
  });

  it("returns empty result for empty input", () => {
    expect(convertColor("")).toEqual({ hex: "", rgb: "", hsl: "", cmyk: "", error: null });
  });

  it("errors on unparsable input", () => {
    const result = convertColor("not-a-color");
    expect(result.error).toBeTruthy();
  });

  it("accepts hex without a leading #", () => {
    const result = convertColor("ff0000");
    expect(result.hex).toBe("#ff0000");
  });
});

describe("convertColor — extended formats and options", () => {
  it("adds HSV, HWB, OKLCH (checked against coloraide) and names", () => {
    const r = convertColor("#4f46e5");
    expect(r.oklch).toBe("oklch(51.06% 0.2301 276.97)");
    expect(r.hwb).toBe("hwb(243 27% 10%)");
    expect(r.hsv).toBe("hsv(243, 69%, 90%)");
    expect(r.name).toBe("≈ slateblue");
    expect(convertColor("#ff0000").name).toBe("red");
    expect(convertColor("#808080").oklch).toBe("oklch(59.99% 0 none)");
  });

  it("parses alpha, modern syntax, named colours and other functions", () => {
    expect(convertColor("rgb(10 200 30 / 50%)")).toMatchObject({ hex: "#0ac81e80", rgb: "rgba(10, 200, 30, 0.5)" });
    expect(convertColor("#0ac81e80").oklch).toBe("oklch(72.28% 0.2385 143.16 / 50%)");
    expect(convertColor("rebeccapurple").hex).toBe("#663399");
    expect(convertColor("hsl(120deg 100% 25%)").hex).toBe("#008000");
    expect(convertColor("hsl(0.5turn, 100%, 50%)").hex).toBe("#00ffff");
    expect(convertColor("hwb(194 0% 0%)").hex).toBe("#00c3ff");
    expect(convertColor("oklch(62.8% 0.2577 29.23)").hex).toBe("#ff0000");
    expect(convertColor("cmyk(0%, 100%, 100%, 0%)").hex).toBe("#ff0000");
    expect(convertColor("0xFF8800").hex).toBe("#ff8800");
    expect(convertColor("transparent").hex).toBe("#00000000");
  });

  it("formats with modern syntax, uppercase hex and decimals", () => {
    const r = convertColor("rgba(79, 70, 229, 0.25)", { syntax: "modern", uppercaseHex: true, precision: 1 });
    expect(r.rgb).toBe("rgb(79 70 229 / 25%)");
    expect(r.hsl).toBe("hsl(243.4 75.4% 58.6% / 25%)");
    expect(r.hex).toBe("#4F46E540");
  });

  it("produces platform snippets", () => {
    const code = Object.fromEntries(convertColor("#4f46e5").code!.map((c) => [c.label, c.value]));
    expect(code["Android / Java int (ARGB)"]).toBe("0xFF4F46E5");
    expect(code["Flutter / Compose"]).toBe("Color(0xFF4F46E5)");
    expect(code["Java AWT"]).toBe("new Color(79, 70, 229)");
    expect(code["Decimal (0xRRGGBB)"]).toBe(String(0x4f46e5));
  });
});

