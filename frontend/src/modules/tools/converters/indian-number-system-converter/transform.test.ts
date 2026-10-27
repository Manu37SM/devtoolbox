import { describe, expect, it } from "vitest";
import { convertIndianNumber, groupIndian, groupInternational, indianWords } from "./transform";

const o = { words: true, shorthand: true } as const;

describe("grouping", () => {
  it.each([
    ["0", "0"], ["999", "999"], ["1000", "1,000"], ["12345", "12,345"], ["123456", "1,23,456"], ["1234567", "12,34,567"],
    ["12345678", "1,23,45,678"], ["1000000000000", "10,00,00,00,00,000"],
  ])("Indian %s -> %s", (d, e) => {
    expect(groupIndian(d)).toBe(e);
  });
  it("International grouping", () => {
    expect(groupInternational("12345678")).toBe("12,345,678");
    expect(groupInternational("999")).toBe("999");
  });
});

describe("indianWords", () => {
  it.each([
    [0n, "zero"], [7n, "seven"], [21n, "twenty-one"], [100n, "one hundred"], [101n, "one hundred one"],
    [1000n, "one thousand"], [100000n, "one lakh"], [123456n, "one lakh twenty-three thousand four hundred fifty-six"],
    [10000000n, "one crore"], [12345678n, "one crore twenty-three lakh forty-five thousand six hundred seventy-eight"],
    [1000000000n, "one hundred crore"], [10n ** 12n, "one lakh crore"],
  ])("%s", (n, words) => {
    expect(indianWords(n)).toBe(words);
  });
});

describe("convertIndianNumber", () => {
  it("shows both groupings, words and lakh/crore", () => {
    const out = convertIndianNumber("12345678", o).output;
    expect(out).toContain("Indian         1,23,45,678");
    expect(out).toContain("International  12,345,678");
    expect(out).toContain("one crore twenty-three lakh");
    expect(out).toContain("123.45678 lakh · 1.2345678 crore");
  });
  it("accepts existing separators, currency symbols, decimals and negatives", () => {
    const out = convertIndianNumber("-₹1,23,456.50", o).output;
    expect(out).toContain("Indian         -1,23,456.50");
    expect(out).toContain("minus one lakh twenty-three thousand four hundred fifty-six point five zero");
  });
  it("is exact beyond Number.MAX_SAFE_INTEGER", () => {
    expect(convertIndianNumber("12345678901234567890", { words: false, shorthand: false }).output).toContain("1,23,45,67,89,01,23,45,67,890");
  });
  it("can hide optional rows", () => {
    const out = convertIndianNumber("5000", { words: false, shorthand: false }).output;
    expect(out).not.toContain("Words");
    expect(out).not.toContain("lakh");
  });
  it("validates", () => {
    expect(convertIndianNumber("12abc", o).error?.line).toBe(1);
    expect(convertIndianNumber("", o)).toEqual({ output: "", error: null });
  });
});
