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
});
