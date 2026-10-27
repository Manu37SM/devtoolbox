import { describe, expect, it } from "vitest";
import { bitwise, evalBitwise, parseInt64 } from "./transform";

describe("parseInt64", () => {
  it("parses dec/hex/bin/oct with underscores and signs", () => {
    expect(parseInt64("255")).toBe(255n);
    expect(parseInt64("0xFF")).toBe(255n);
    expect(parseInt64("0b1010_1010")).toBe(170n);
    expect(parseInt64("0o17")).toBe(15n);
    expect(parseInt64("-0x10")).toBe(-16n);
    expect(parseInt64("1.5")).toBeNull();
    expect(parseInt64("abc")).toBeNull();
  });
});

describe("evalBitwise", () => {
  it.each([
    ["0xF0 & 0x3C", 32, 0x30n],
    ["0xF0 | 0x0F", 32, 0xffn],
    ["0xFF ^ 0x0F", 32, 0xf0n],
    ["1 << 4", 32, 16n],
    ["1 << 31", 32, 0x80000000n],
    ["1 << 32", 32, 0n],
    ["~0", 8, 255n],
    ["~0", 32, 0xffffffffn],
    ["~5", 8, 250n],
    ["-1 >>> 28", 32, 15n],
    ["-16 >> 2", 32, 0xfffffffcn], // arithmetic: stays negative (-4)
    ["-1", 8, 255n],
    ["300", 8, 44n], // wraps to width
  ])("%s @%d bits = %s", (expr, bits, expected) => {
    expect(evalBitwise(expr, bits)).toBe(expected);
  });
  it("works at 64 bits without precision loss", () => {
    expect(evalBitwise("0xFFFFFFFFFFFFFFFF & 0x0123456789ABCDEF", 64)).toBe(0x0123456789abcdefn);
    expect(evalBitwise("1 << 63", 64)).toBe(9223372036854775808n);
  });
  it("rejects nonsense", () => {
    expect(() => evalBitwise("hello", 32)).toThrow();
    expect(() => evalBitwise("1 & x", 32)).toThrow(/Invalid operand/);
  });
});

describe("bitwise", () => {
  it("prints unsigned, signed, hex and grouped binary", () => {
    const out = bitwise("0x80", { width: "8" }).output;
    expect(out).toContain("unsigned  128");
    expect(out).toContain("signed    -128");
    expect(out).toContain("hex       0x80");
    expect(out).toContain("binary    10000000");
    expect(bitwise("1", { width: "16" }).output).toContain("00000000 00000001");
  });
  it("reports the failing line", () => {
    expect(bitwise("1 & 1\nbad", { width: "32" }).error?.line).toBe(2);
    expect(bitwise("", { width: "32" })).toEqual({ output: "", error: null });
  });
});
