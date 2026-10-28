import { describe, expect, it } from "vitest";
import { approximate, convertFractions, parseValue, toDecimal } from "./transform";

const o = { maxDenominator: "1000" as const, precision: 10, mixed: true };
const f = (n: number, d: number) => ({ n: BigInt(n), d: BigInt(d) });

describe("parseValue", () => {
  it("reads decimals, fractions, mixed numbers, percents and exponents exactly", () => {
    expect(parseValue("0.125")).toEqual(f(1, 8));
    expect(parseValue("6/8")).toEqual(f(3, 4));
    expect(parseValue("1 3/4")).toEqual(f(7, 4));
    expect(parseValue("-2 1/2")).toEqual(f(-5, 2));
    expect(parseValue("12.5%")).toEqual(f(1, 8));
    expect(parseValue("1.5e-3")).toEqual(f(3, 2000));
    expect(parseValue("-3/-6")).toEqual(f(1, 2));
    expect(parseValue(".5")).toEqual(f(1, 2));
    expect(parseValue("1,000")).toEqual(f(1000, 1));
  });
  it("rejects nonsense and division by zero", () => {
    expect(() => parseValue("abc")).toThrow(/Cannot read/);
    expect(() => parseValue("1/0")).toThrow(/zero/);
    expect(() => parseValue("1e999")).toThrow(/Exponent/);
  });
});

describe("toDecimal", () => {
  it("detects repeating decimals", () => {
    expect(toDecimal(f(1, 3), 10).text).toBe("0.(3)");
    expect(toDecimal(f(1, 6), 10).text).toBe("0.1(6)");
    expect(toDecimal(f(1, 7), 4).text).toBe("0.1428…");
    expect(toDecimal(f(1, 7), 20).text).toBe("0.(142857)");
    expect(toDecimal(f(-7, 4), 10).text).toBe("-1.75");
    expect(toDecimal(f(5, 1), 10).text).toBe("5");
  });
});

describe("approximate", () => {
  it("finds the best rational approximation (pi -> 355/113, 22/7)", () => {
    const pi = parseValue("3.14159265358979");
    expect(approximate(pi, 1000n)).toEqual(f(355, 113));
    expect(approximate(pi, 10n)).toEqual(f(22, 7));
    expect(approximate(pi, 1n)).toEqual(f(3, 1));
  });
  it("leaves small denominators alone and handles negatives", () => {
    expect(approximate(f(3, 4), 16n)).toEqual(f(3, 4));
    expect(approximate(parseValue("-0.333333333"), 100n)).toEqual(f(-1, 3));
  });
});

describe("convertFractions", () => {
  it("prints fraction, mixed number, decimal and percent", () => {
    const r = convertFractions("1 3/4", o).output;
    expect(r).toContain("Fraction:  7/4");
    expect(r).toContain("Mixed:     1 3/4");
    expect(r).toContain("Decimal:   1.75");
    expect(r).toContain("Percent:   175%");
  });
  it("flags approximations and repeating decimals", () => {
    expect(convertFractions("3.14159265358979", { ...o, maxDenominator: "100" }).output).toContain("Fraction:  311/99  (nearest with denominator ≤ 100)");
    expect(convertFractions("2/3", o).output).toContain("0.(6)  (repeating)");
  });
  it("reports bad lines", () => {
    expect(convertFractions("1/2\nx", o).error?.line).toBe(2);
    expect(convertFractions("", o)).toEqual({ output: "", error: null });
  });
});
