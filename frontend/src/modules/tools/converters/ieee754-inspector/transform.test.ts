import { describe, expect, it } from "vitest";
import { classify, floatBits, fromHex, inspectIeee754 } from "./transform";

const o = { width: "both" } as const;

describe("floatBits", () => {
  it("encodes known float64 patterns", () => {
    expect(floatBits(1, 64).hex).toBe("3FF0000000000000");
    expect(floatBits(-2, 64).hex).toBe("C000000000000000");
    expect(floatBits(0.1, 64).hex).toBe("3FB999999999999A");
    expect(floatBits(-0, 64).sign).toBe("1");
  });
  it("encodes known float32 patterns", () => {
    expect(floatBits(1, 32).hex).toBe("3F800000");
    expect(floatBits(0.1, 32).hex).toBe("3DCCCCCD");
    expect(floatBits(-118.625, 32)).toMatchObject({ sign: "1", exponent: "10000101", mantissa: "11011010100000000000000" });
  });
  it("encodes specials", () => {
    expect(floatBits(Infinity, 32).hex).toBe("7F800000");
    expect(floatBits(-Infinity, 64).hex).toBe("FFF0000000000000");
    expect(floatBits(NaN, 64).exponent).toBe("11111111111");
  });
});

describe("classify", () => {
  it("separates normal, subnormal, zero, infinity and NaN", () => {
    expect(classify("01111111", "0".repeat(23))).toBe("normal");
    expect(classify("00000000", "0".repeat(22) + "1")).toBe("subnormal");
    expect(classify("00000000", "0".repeat(23))).toBe("zero");
    expect(classify("11111111", "0".repeat(23))).toBe("infinity");
    expect(classify("11111111", "1" + "0".repeat(22))).toBe("NaN");
  });
});

describe("fromHex", () => {
  it("decodes 8 and 16 digit hex", () => {
    expect(fromHex("0x3F800000")).toEqual({ value: 1, width: 32 });
    expect(fromHex("0x4000000000000000")).toEqual({ value: 2, width: 64 });
    expect(fromHex("0x1234")).toBeNull();
    expect(fromHex("0xZZZZZZZZ")).toBeNull();
  });
});

describe("inspectIeee754", () => {
  it("shows the classic 0.1 representation error", () => {
    const out = inspectIeee754("0.1", { width: "64" }).output;
    expect(out).toContain("0x3FB999999999999A");
    expect(out).toContain("0.10000000000000001");
    expect(out).toContain("unbiased -4");
  });
  it("shows float32 rounding", () => {
    const out = inspectIeee754("16777217", { width: "32" }).output;
    expect(out).toContain("rounded from 16777217");
  });
  it("handles -0, NaN, Infinity and subnormals", () => {
    expect(inspectIeee754("-0", { width: "64" }).output).toContain("sign      1 (negative)");
    expect(inspectIeee754("NaN", { width: "64" }).output).toContain("type      NaN");
    expect(inspectIeee754("-Infinity", { width: "32" }).output).toContain("type      infinity");
    expect(inspectIeee754("5e-324", { width: "64" }).output).toContain("type      subnormal");
  });
  it("reports both widths and decodes hex input", () => {
    const out = inspectIeee754("1", o).output;
    expect(out).toContain("binary32");
    expect(out).toContain("binary64");
    expect(inspectIeee754("0x40490FDB", o).output).toContain("3.1415927410125732");
  });
  it("validates", () => {
    expect(inspectIeee754("abc", o).error?.line).toBe(1);
    expect(inspectIeee754("0x12", o).error).not.toBeNull();
    expect(inspectIeee754("", o)).toEqual({ output: "", error: null });
  });
});
