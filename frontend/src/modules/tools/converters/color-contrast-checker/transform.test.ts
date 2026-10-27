import { describe, expect, it } from "vitest";
import { checkContrast, contrastRatio, luminance, parseHex } from "./transform";

const opts = { includeUi: false } as const;

describe("contrast maths", () => {
  it("black on white is exactly 21:1", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(luminance([255, 255, 255])).toBeCloseTo(1, 5);
  });
  it("same colour is 1:1 and order does not matter", () => {
    expect(contrastRatio([10, 20, 30], [10, 20, 30])).toBeCloseTo(1, 5);
    expect(contrastRatio([0, 0, 0], [119, 119, 119])).toBeCloseTo(contrastRatio([119, 119, 119], [0, 0, 0]), 8);
  });
  it("#767676 on white is the classic ~4.54:1 AA boundary", () => {
    expect(contrastRatio([0x76, 0x76, 0x76], [255, 255, 255])).toBeCloseTo(4.54, 2);
  });
  it("parses 3 and 6 digit hex, with or without #", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("1a2b3c")).toEqual([26, 43, 60]);
    expect(parseHex("#12")).toBeNull();
  });
});

describe("checkContrast", () => {
  it("reports AA/AAA verdicts", () => {
    const out = checkContrast("#767676 on #ffffff", opts).output;
    expect(out).toContain("4.54:1");
    expect(out).toMatch(/AA {3}normal text \(≥4\.5\) {2}pass/);
    expect(out).toMatch(/AAA {2}normal text \(≥7\) {4}FAIL/);
  });
  it("truncates instead of rounding up across a threshold", () => {
    // #777777 on white = 4.478 -> must NOT display as 4.5 and must fail AA
    const out = checkContrast("#777 #fff", opts).output;
    expect(out).toContain("4.47:1");
    expect(out).toMatch(/normal text \(≥4\.5\) {2}FAIL/);
  });
  it("accepts comma/space separated pairs and multiple lines", () => {
    expect(checkContrast("#000,#fff\n#fff #000", opts).output.split("\n\n")).toHaveLength(2);
  });
  it("adds the UI line when asked and errors with a line number on bad input", () => {
    expect(checkContrast("#000 #fff", { includeUi: true }).output).toContain("UI components");
    expect(checkContrast("#000 #fff\nnope", opts).error).toEqual({ message: expect.stringContaining("two hex colors"), line: 2 });
    expect(checkContrast("", opts)).toEqual({ output: "", error: null });
  });
});
