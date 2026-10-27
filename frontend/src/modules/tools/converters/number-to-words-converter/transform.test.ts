import { describe, expect, it } from "vitest";
import { convertNumberWords, integerToWords, numberStringToWords, wordsToNumberString, wordsToOrdinal } from "./transform";

const cardinal = { style: "cardinal", useAnd: false } as const;
const base = { mode: "to-words", style: "cardinal", useAnd: false } as const;

describe("integerToWords", () => {
  it("handles zero, teens and tens", () => {
    expect(integerToWords(0n)).toBe("zero");
    expect(integerToWords(13n)).toBe("thirteen");
    expect(integerToWords(40n)).toBe("forty");
    expect(integerToWords(99n)).toBe("ninety-nine");
  });

  it("handles hundreds and scales, skipping empty groups", () => {
    expect(integerToWords(100n)).toBe("one hundred");
    expect(integerToWords(1001n)).toBe("one thousand one");
    expect(integerToWords(1_000_000n)).toBe("one million");
    expect(integerToWords(123_456_789n)).toBe(
      "one hundred twenty-three million four hundred fifty-six thousand seven hundred eighty-nine",
    );
  });

  it("supports the British 'and'", () => {
    expect(integerToWords(101n, true)).toBe("one hundred and one");
    expect(integerToWords(1005n, true)).toBe("one thousand and five");
    expect(integerToWords(1100n, true)).toBe("one thousand one hundred");
    expect(integerToWords(342n, true)).toBe("three hundred and forty-two");
  });

  it("handles negatives and the upper bound", () => {
    expect(integerToWords(-5n)).toBe("negative five");
    expect(integerToWords(10n ** 21n - 1n)).toContain("quintillion");
    expect(() => integerToWords(10n ** 21n)).toThrow();
  });
});

describe("wordsToOrdinal", () => {
  it.each([
    ["one", "first"], ["two", "second"], ["three", "third"], ["five", "fifth"], ["eight", "eighth"],
    ["nine", "ninth"], ["twelve", "twelfth"], ["four", "fourth"], ["twenty", "twentieth"],
    ["twenty-one", "twenty-first"], ["one hundred", "one hundredth"], ["one thousand two", "one thousand second"],
    ["one million", "one millionth"],
  ])("%s -> %s", (cardinalWords, expected) => {
    expect(wordsToOrdinal(cardinalWords)).toBe(expected);
  });
});

describe("numberStringToWords", () => {
  it("accepts separators and signs", () => {
    expect(numberStringToWords("1,234", cardinal)).toBe("one thousand two hundred thirty-four");
    expect(numberStringToWords("-7", cardinal)).toBe("negative seven");
    expect(numberStringToWords("+7", cardinal)).toBe("seven");
  });

  it("spells decimals digit by digit", () => {
    expect(numberStringToWords("3.14", cardinal)).toBe("three point one four");
    expect(numberStringToWords("-0.5", cardinal)).toBe("negative zero point five");
  });

  it("supports ordinals for whole numbers only", () => {
    expect(numberStringToWords("21", { style: "ordinal", useAnd: false })).toBe("twenty-first");
    expect(() => numberStringToWords("2.5", { style: "ordinal", useAnd: false })).toThrow(/whole/);
  });

  it("rejects garbage", () => {
    expect(() => numberStringToWords("12abc", cardinal)).toThrow();
    expect(() => numberStringToWords("1e5", cardinal)).toThrow();
  });
});

describe("wordsToNumberString", () => {
  it("parses compound numbers", () => {
    expect(wordsToNumberString("one hundred twenty-three")).toBe("123");
    expect(wordsToNumberString("One thousand, two hundred and thirty-four")).toBe("1234");
    expect(wordsToNumberString("two million three thousand four")).toBe("2003004");
  });

  it("parses negatives and decimals", () => {
    expect(wordsToNumberString("minus five")).toBe("-5");
    expect(wordsToNumberString("three point one four")).toBe("3.14");
    expect(wordsToNumberString("negative zero")).toBe("0");
  });

  it("round-trips with integerToWords", () => {
    for (const n of [0n, 7n, 19n, 20n, 101n, 999n, 1000n, 12_345n, 1_000_001n, 987_654_321_012n]) {
      expect(wordsToNumberString(integerToWords(n))).toBe(n.toString());
    }
  });

  it("errors on unknown words and bad decimals", () => {
    expect(() => wordsToNumberString("seventy-banana")).toThrow(/banana/);
    expect(() => wordsToNumberString("three point")).toThrow();
    expect(() => wordsToNumberString("three point twelve")).toThrow();
  });
});

describe("convertNumberWords", () => {
  it("returns an error object rather than throwing", () => {
    expect(convertNumberWords("nope", base).error).not.toBeNull();
    expect(convertNumberWords("nope", { ...base, mode: "to-number" }).error).not.toBeNull();
  });

  it("returns empty output for blank input", () => {
    expect(convertNumberWords("  ", base)).toEqual({ output: "", error: null });
  });
});
