import { describe, expect, it } from "vitest";
import { evaluate, evaluateLines, formatNumber } from "./transform";

describe("evaluate", () => {
  it.each([
    ["1 + 2 * 3", 7], ["(1 + 2) * 3", 9], ["10 / 4", 2.5], ["10 % 3", 1], ["2 ^ 10", 1024], ["2 ** 3", 8],
    ["2 ^ 3 ^ 2", 512], ["-2 ^ 2", -4], ["2 ^ -1", 0.5], ["-(3 + 4)", -7], ["--3", 3], ["1e3 + .5", 1000.5],
    ["sqrt(16) + abs(-2)", 6], ["max(1, 5, 3)", 5], ["min(4, 2)", 2], ["log(1000)", 3], ["ln(e)", 1], ["floor(2.9) + ceil(2.1)", 5],
    ["round(2.5)", 3], ["pi * 2", Math.PI * 2],
  ])("%s = %s", (src, expected) => {
    expect(evaluate(src)).toBeCloseTo(expected, 10);
  });

  it("supports degrees", () => {
    expect(evaluate("sin(90)", "deg")).toBeCloseTo(1, 10);
    expect(evaluate("cos(180)", "deg")).toBeCloseTo(-1, 10);
    expect(evaluate("asin(1)", "deg")).toBeCloseTo(90, 10);
    expect(evaluate("sin(pi/2)", "rad")).toBeCloseTo(1, 10);
  });

  it("follows IEEE semantics for division by zero rather than throwing", () => {
    expect(evaluate("1/0")).toBe(Infinity);
    expect(evaluate("0/0")).toBeNaN();
  });

  it.each(["1 +", "(1 + 2", "1 2", "foo(1)", "bar", "1 $ 2", ")", "sqrt(", "2 * * 3"])("rejects %j", (src) => {
    expect(() => evaluate(src)).toThrow();
  });

  it("cannot execute JavaScript", () => {
    expect(() => evaluate("process.exit()")).toThrow();
    expect(() => evaluate("constructor")).toThrow(/Unknown name/);
    expect(() => evaluate("toString(1)")).toThrow(/Unknown function/);
    expect(() => evaluate("__proto__")).toThrow();
  });
});

describe("formatNumber", () => {
  it("trims float noise and switches to exponent form at the extremes", () => {
    expect(formatNumber(0.1 + 0.2, 12)).toBe("0.3");
    expect(formatNumber(1 / 3, 6)).toBe("0.333333");
    expect(formatNumber(1e25, 12)).toBe("1e+25");
    expect(formatNumber(1e-12, 12)).toBe("1e-12");
    expect(formatNumber(Infinity, 12)).toBe("Infinity");
    expect(formatNumber(0, 12)).toBe("0");
  });
});

describe("evaluateLines", () => {
  const o = { angle: "rad", precision: 12, allowCommas: true } as const;
  it("evaluates line by line with variables and comments", () => {
    const r = evaluateLines("price = 1200 // base\ntax = price * 0.18\nprice + tax", o);
    expect(r.output).toBe("price = 1200\ntax = 216\n1416");
  });
  it("keeps blank lines aligned and reports the failing line", () => {
    expect(evaluateLines("1+1\n\n2*", o).error?.line).toBe(3);
    expect(evaluateLines("1\n\n2", o).output).toBe("1\n\n2");
  });
  it("strips thousands separators in plain expressions", () => {
    expect(evaluateLines("1,500 + 500", o).output).toBe("2000");
  });
  it("returns nothing for empty input", () => {
    expect(evaluateLines("  \n ", o)).toEqual({ output: "", error: null });
  });
});
