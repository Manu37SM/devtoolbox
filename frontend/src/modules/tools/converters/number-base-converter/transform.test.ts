import { describe, expect, it } from "vitest";
import { convertNumberBase } from "./transform";

describe("convertNumberBase", () => {
  it("converts decimal to all bases", () => {
    const result = convertNumberBase("255", 10);
    expect(result).toEqual({ binary: "11111111", octal: "377", decimal: "255", hex: "ff", error: null });
  });

  it("converts hex to all bases", () => {
    const result = convertNumberBase("ff", 16);
    expect(result.decimal).toBe("255");
    expect(result.binary).toBe("11111111");
  });

  it("converts binary to all bases", () => {
    const result = convertNumberBase("1010", 2);
    expect(result.decimal).toBe("10");
    expect(result.hex).toBe("a");
  });

  it("handles negative numbers", () => {
    const result = convertNumberBase("-42", 10);
    expect(result.hex).toBe("-2a");
    expect(result.binary).toBe("-101010");
  });

  it("handles arbitrarily large numbers via BigInt", () => {
    const result = convertNumberBase("123456789012345678901234567890", 10);
    expect(result.hex).toBe((123456789012345678901234567890n).toString(16));
  });

  it("returns empty result for empty input", () => {
    expect(convertNumberBase("", 10)).toEqual({
      binary: "",
      octal: "",
      decimal: "",
      hex: "",
      error: null,
    });
  });

  it("errors on digits invalid for the source base", () => {
    const result = convertNumberBase("129", 2);
    expect(result.error).toBeTruthy();
  });

  it("accepts prefixes, underscores and spaces in the input", () => {
    expect(convertNumberBase("0xFF", 16).decimal).toBe("255");
    expect(convertNumberBase("1111_0000", 2).hex).toBe("f0");
    expect(convertNumberBase("1,000,000", 10).hex).toBe("f4240");
  });

  it("shows negative numbers as two's complement for a bit width and reads hex as signed", () => {
    expect(convertNumberBase("-1", 10, { bitWidth: "8" })).toMatchObject({ binary: "11111111", hex: "ff", decimal: "255", signed: "-1" });
    expect(convertNumberBase("80000000", 16, { bitWidth: "32" })).toMatchObject({ signed: "-2147483648", binary: "1".padEnd(32, "0") });
    expect(convertNumberBase("5", 10, { bitWidth: "16" })).toMatchObject({ binary: "0000000000000101", hex: "0005", signed: "5" });
    expect(convertNumberBase("256", 10, { bitWidth: "8" }).error).toBe("256 does not fit in 8 bits (range -128 to 255).");
    expect(convertNumberBase("-9223372036854775808", 10, { bitWidth: "64" }).hex).toBe("8000000000000000");
  });

  it("groups digits, uppercases hex and adds prefixes", () => {
    expect(convertNumberBase("3735928559", 10, { grouping: true, uppercase: true, prefixes: true })).toMatchObject({
      binary: "0b1101 1110 1010 1101 1011 1110 1110 1111",
      hex: "0xDE AD BE EF",
      decimal: "3,735,928,559",
      octal: "0o33 653 337 357",
    });
  });
});

