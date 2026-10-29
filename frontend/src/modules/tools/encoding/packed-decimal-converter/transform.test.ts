import { describe, expect, it } from "vitest";
import { bytesToHex, hexToBytes } from "@/lib/byte-input";
import { decode, encode, formatScaled, parsePic, runPackedDecimalConverter, toUnscaled } from "./transform";

const hex = (v: string, pic: string, f: "comp-3" | "zoned" | "comp") => { const p = parsePic(pic); return bytesToHex(encode(toUnscaled(v, p), p, f)); };
const val = (h: string, pic: string, f: "comp-3" | "zoned" | "comp") => { const p = parsePic(pic); return formatScaled(decode(hexToBytes(h), p, f).value, p); };

describe("parsePic", () => {
  it("counts digits and scale", () => {
    expect(parsePic("S9(7)V99")).toEqual({ signed: true, intDigits: 7, decDigits: 2, total: 9 });
    expect(parsePic("PIC 9(5) COMP-3")).toEqual({ signed: false, intDigits: 5, decDigits: 0, total: 5 });
    expect(parsePic("s999v9(3)")).toEqual({ signed: true, intDigits: 3, decDigits: 3, total: 6 });
    expect(() => parsePic("X(10)")).toThrow("Unsupported PIC");
  });
});

describe("COMP-3", () => {
  it("packs with C/D/F sign nibbles", () => {
    expect(hex("12345.67", "S9(7)V99", "comp-3")).toBe("001234567C");
    expect(hex("-12345.67", "S9(7)V99", "comp-3")).toBe("001234567D");
    expect(hex("123", "9(5)", "comp-3")).toBe("00123F");
    expect(hex("5", "S9(4)", "comp-3")).toBe("00005C");
  });
  it("unpacks and validates", () => {
    expect(val("001234567D", "S9(7)V99", "comp-3")).toBe("-12345.67");
    expect(val("00000C", "S9(4)V9", "comp-3")).toBe("0.0");
    expect(() => val("00123456", "S9(7)V99", "comp-3")).toThrow(/pack into 5 bytes/);
    expect(() => val("00A2345C", "S9(6)V9", "comp-3")).toThrow(/non-decimal nibble/);
  });
});

describe("zoned and binary", () => {
  it("zoned decimal uses F zones and a C/D sign zone", () => {
    expect(hex("-123", "S9(5)", "zoned")).toBe("F0F0F1F2D3");
    expect(hex("123", "9(3)", "zoned")).toBe("F1F2F3");
    expect(val("F0F0F1F2D3", "S9(5)", "zoned")).toBe("-123");
  });
  it("COMP is big-endian two's complement sized by digits", () => {
    expect(hex("-1", "S9(4)", "comp")).toBe("FFFF");
    expect(hex("123456789", "S9(9)", "comp")).toBe("075BCD15");
    expect(hex("1.5", "S9(15)V9(3)", "comp")).toBe("00000000000005DC");
    expect(val("FFFF", "S9(4)", "comp")).toBe("-1");
    expect(val("FFFF", "9(4)", "comp")).toBe("65535");
  });
});

describe("validation and runner", () => {
  it("rejects overflow, extra decimals and negatives on unsigned PICs", () => {
    expect(() => toUnscaled("1234567890", parsePic("S9(7)V99"))).toThrow(/needs 12 digits/);
    expect(() => toUnscaled("1.234", parsePic("S9(7)V99"))).toThrow(/more than 2 decimal places/);
    expect(() => toUnscaled("-5", parsePic("9(3)"))).toThrow(/no S/);
    expect(toUnscaled("1.50", parsePic("9V9"))).toBe(15n);
  });
  it("converts many lines and reports per-line errors", () => {
    const out = runPackedDecimalConverter("12.5\nabc", { direction: "encode", format: "comp-3", pic: "S9(3)V99" }).output;
    expect(out).toContain("PIC S9(3)V99 COMP-3: 5 digits (2 after the implied decimal point), 3 bytes, signed");
    expect(out).toContain("12.5             -> 01 25 0C");
    expect(out).toContain('abc              -> error: "abc" is not a number.');
  });
});
