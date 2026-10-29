import { describe, expect, it } from "vitest";
import { exactDouble, javaDoubleToString, MODES, parseDecimal, runBigdecimalRounding, setScale, toPlain } from "./transform";

const round = (v: string, scale: number, mode: (typeof MODES)[number]) => {
  const r = setScale(parseDecimal(v)!, scale, mode);
  return r ? toPlain(r) : "throws";
};

describe("setScale matches the java.math.RoundingMode javadoc table", () => {
  const inputs = ["5.5", "2.5", "1.6", "1.1", "1.0", "-1.0", "-1.1", "-1.6", "-2.5", "-5.5"];
  const table: Record<string, string[]> = {
    UP: ["6", "3", "2", "2", "1", "-1", "-2", "-2", "-3", "-6"],
    DOWN: ["5", "2", "1", "1", "1", "-1", "-1", "-1", "-2", "-5"],
    CEILING: ["6", "3", "2", "2", "1", "-1", "-1", "-1", "-2", "-5"],
    FLOOR: ["5", "2", "1", "1", "1", "-1", "-2", "-2", "-3", "-6"],
    HALF_UP: ["6", "3", "2", "1", "1", "-1", "-1", "-2", "-3", "-6"],
    HALF_DOWN: ["5", "2", "2", "1", "1", "-1", "-1", "-2", "-2", "-5"],
    HALF_EVEN: ["6", "2", "2", "1", "1", "-1", "-1", "-2", "-2", "-6"],
    UNNECESSARY: ["throws", "throws", "throws", "throws", "1", "-1", "throws", "throws", "throws", "throws"],
  };
  for (const mode of MODES) {
    it(mode, () => expect(inputs.map((v) => round(v, 0, mode))).toEqual(table[mode]));
  }
});

describe("decimal helpers", () => {
  it("keeps BigDecimal scale semantics", () => {
    expect(parseDecimal("1.50")).toEqual({ unscaled: 150n, scale: 2 });
    expect(parseDecimal("1E+3")).toEqual({ unscaled: 1n, scale: -3 });
    expect(toPlain(parseDecimal("1E+3")!)).toBe("1000");
    expect(toPlain(parseDecimal("-0.05")!)).toBe("-0.05");
    expect(round("2.345", 2, "HALF_EVEN")).toBe("2.34");
    expect(round("2.355", 2, "HALF_EVEN")).toBe("2.36");
    expect(round("1234.5", -2, "HALF_UP")).toBe("1200");
    expect(round("7", 2, "UNNECESSARY")).toBe("7.00");
    expect(parseDecimal("abc")).toBeNull();
  });
  it("gives the exact value of a double (Python Decimal(x) agrees)", () => {
    expect(exactDouble(0.1)).toBe("0.1000000000000000055511151231257827021181583404541015625");
    expect(exactDouble(2.675)).toBe("2.67499999999999982236431605997495353221893310546875");
    expect(exactDouble(1e21)).toBe("1000000000000000000000");
    expect(exactDouble(5e-324).startsWith("0.000000")).toBe(true);
    expect(exactDouble(5e-324).endsWith("65625")).toBe(true);
  });
  it("formats like Double.toString", () => {
    expect(javaDoubleToString(2)).toBe("2.0");
    expect(javaDoubleToString(0.1)).toBe("0.1");
    expect(javaDoubleToString(1e7)).toBe("1.0E7");
    expect(javaDoubleToString(1.5e-5)).toBe("1.5E-5");
    expect(javaDoubleToString(0.001)).toBe("0.001");
    expect(javaDoubleToString(-123.45)).toBe("-123.45");
  });
});

describe("runBigdecimalRounding", () => {
  it("renders a table and explains double pitfalls", () => {
    const out = runBigdecimalRounding("2.675\n1.50", { scale: 2, showDouble: true }).output;
    expect(out).toMatch(/2\.675\s+2\.68\s+2\.67\s+2\.68\s+2\.67\s+2\.68\s+2\.67\s+2\.68\s+throws/);
    expect(out).toContain("new BigDecimal(2.675)          = 2.67499999999999982236431605997495353221893310546875");
    expect(out).toContain("HALF_UP of the double at scale 2: 2.67  <- differs from the String constructor");
    expect(out).not.toContain("new BigDecimal(1.50)");
  });
  it("rejects non-numbers", () => {
    expect(runBigdecimalRounding("12,5", { scale: 2, showDouble: false }).error?.message).toContain("not a decimal");
  });
});
