import { describe, expect, it } from "vitest";
import { convertRomanNumeral, numberToRoman, romanToNumber } from "./transform";

describe("numberToRoman", () => {
  it("converts basic and subtractive-form numbers", () => {
    expect(numberToRoman(1)).toBe("I");
    expect(numberToRoman(4)).toBe("IV");
    expect(numberToRoman(9)).toBe("IX");
    expect(numberToRoman(40)).toBe("XL");
    expect(numberToRoman(90)).toBe("XC");
    expect(numberToRoman(1994)).toBe("MCMXCIV");
    expect(numberToRoman(3999)).toBe("MMMCMXCIX");
  });
});

describe("romanToNumber", () => {
  it("parses basic numerals", () => {
    expect(romanToNumber("I")).toBe(1);
    expect(romanToNumber("IV")).toBe(4);
    expect(romanToNumber("IX")).toBe(9);
    expect(romanToNumber("MCMXCIV")).toBe(1994);
    expect(romanToNumber("MMMCMXCIX")).toBe(3999);
  });

  it("is case-insensitive", () => {
    expect(romanToNumber("mcmxciv")).toBe(1994);
  });
});

describe("convertRomanNumeral — to-roman", () => {
  it("converts a valid number", () => {
    expect(convertRomanNumeral("1994", "to-roman")).toEqual({ output: "MCMXCIV", error: null });
  });

  it("errors on non-integer input", () => {
    expect(convertRomanNumeral("3.5", "to-roman").error).not.toBeNull();
  });

  it("errors on out-of-range input", () => {
    expect(convertRomanNumeral("0", "to-roman").error).not.toBeNull();
    expect(convertRomanNumeral("4000", "to-roman").error).not.toBeNull();
  });

  it("returns empty output for empty input", () => {
    expect(convertRomanNumeral("", "to-roman")).toEqual({ output: "", error: null });
  });
});

describe("convertRomanNumeral — from-roman", () => {
  it("converts a valid Roman numeral", () => {
    expect(convertRomanNumeral("MCMXCIV", "from-roman")).toEqual({ output: "1994", error: null });
  });

  it("accepts lowercase input", () => {
    expect(convertRomanNumeral("xiv", "from-roman").output).toBe("14");
  });

  it("errors on invalid characters", () => {
    expect(convertRomanNumeral("MCMXCIVA", "from-roman").error).not.toBeNull();
  });

  it("errors on non-canonical form (e.g. IIII)", () => {
    expect(convertRomanNumeral("IIII", "from-roman").error).not.toBeNull();
  });

  it("errors on invalid subtractive pairs (e.g. VX)", () => {
    expect(convertRomanNumeral("VX", "from-roman").error).not.toBeNull();
  });
});
