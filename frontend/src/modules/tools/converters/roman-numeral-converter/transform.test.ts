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

describe("roman numeral options", () => {
  it("formats lower-case, Unicode and clock-face four", () => {
    expect(convertRomanNumeral("1994", "to-roman", { lowercase: true }).output).toBe("mcmxciv");
    expect(convertRomanNumeral("12", "to-roman", { style: "unicode" }).output).toBe("Ⅻ");
    expect(convertRomanNumeral("2024", "to-roman", { style: "unicode" }).output).toBe("ⅯⅯⅩⅩⅠⅤ");
    expect(convertRomanNumeral("4", "to-roman", { clockFour: true }).output).toBe("IIII");
    expect(convertRomanNumeral("14", "to-roman", { clockFour: true }).output).toBe("XIIII");
  });

  it("uses a vinculum for large numbers", () => {
    expect(convertRomanNumeral("4000", "to-roman").error?.message).toContain("vinculum");
    expect(convertRomanNumeral("1,234,567", "to-roman", { vinculum: true }).output).toBe("M\u0305C\u0305C\u0305X\u0305X\u0305X\u0305I\u0305V\u0305DLXVII");
    expect(convertRomanNumeral("I\u0305V\u0305CCCXXI", "from-roman", { vinculum: true }).output).toBe("4321");
  });

  it("reads Unicode numerals and can accept non-canonical forms", () => {
    expect(convertRomanNumeral("Ⅻ", "from-roman").output).toBe("12");
    expect(convertRomanNumeral("ⅿⅽⅿⅹⅽⅳ", "from-roman").output).toBe("1994");
    expect(convertRomanNumeral("IIII", "from-roman", { clockFour: true }).output).toBe("4");
    expect(convertRomanNumeral("IIIII", "from-roman").error?.message).toContain("expected V");
    expect(convertRomanNumeral("IIIII", "from-roman", { strict: false }).output).toBe("5");
  });

  it("converts several lines at once", () => {
    expect(convertRomanNumeral("1\n\n2024", "to-roman").output).toBe("I\n\nMMXXIV");
    expect(convertRomanNumeral("1\nabc", "to-roman").error?.message).toBe('Line 2: "abc" is not a valid integer.');
  });
});

