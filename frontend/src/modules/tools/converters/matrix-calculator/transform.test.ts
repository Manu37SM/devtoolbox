import { describe, expect, it } from "vitest";
import { calculateMatrix, fracToDecimal, frac, parseNumber } from "./transform";

// Expected values were computed with sympy (exact rational arithmetic).
const A = "2 1 3\n0 -1 4\n5 2 1/2";
const B = "1 2\n3 4\n5 6";
const grid = (out: string) => out.split("\n").filter((l) => l.startsWith("[")).map((l) => l.replace(/^\[\s*|\s*\]$/g, "").split(/\s{2,}|\s+/).filter(Boolean));
const run = (op: string, a = A, b = "", extra = {}) => calculateMatrix(a, b, { operation: op as never, ...extra });

describe("matrix calculator", () => {
  it("computes the determinant, trace and rank exactly", () => {
    expect(run("determinant").output).toBe("det(A) = 18");
    expect(run("trace").output).toBe("tr(A) = 3/2");
    expect(run("rank", "1 2 3\n2 4 6\n1 0 1").output).toBe("rank(A) = 2");
  });
  it("inverts, and rejects singular matrices", () => {
    expect(grid(run("inverse").output)).toEqual([["-17/36", "11/36", "7/18"], ["10/9", "-7/9", "-4/9"], ["5/18", "1/18", "-1/9"]]);
    expect(run("inverse", "1 2\n2 4").error?.message).toMatch(/singular/);
    expect(run("inverse", "1 2 3\n4 5 6").error?.message).toMatch(/square/);
  });
  it("row-reduces", () => {
    expect(grid(run("rref").output)).toEqual([["1", "0", "0"], ["0", "1", "0"], ["0", "0", "1"]]);
    expect(run("rref", "1 2\n2 4").output).toContain("pivot columns 1");
  });
  it("multiplies, adds and checks sizes", () => {
    expect(grid(run("multiply", A, B).output)).toEqual([["20", "26"], ["17", "20"], ["27/2", "21"]]);
    expect(run("multiply", B, B).error?.message).toMatch(/Cannot multiply a 3×2/);
    expect(grid(run("add", "1 2\n3 4", "5 6\n7 8").output)).toEqual([["6", "8"], ["10", "12"]]);
    expect(run("subtract", "1 2", "1 2 3").error?.message).toMatch(/sizes must match/);
  });
  it("raises to positive and negative powers", () => {
    expect(grid(run("power", A, "", { exponent: 3 }).output)).toEqual([["191/2", "35", "363/4"], ["30", "7", "95"], ["565/4", "55", "521/8"]]);
    expect(grid(run("power", A, "", { exponent: -2 }).output)).toEqual([["869/1296", "-467/1296", "-235/648"], ["-245/162", "149/162", "67/81"], ["-65/648", "23/648", "31/324"]]);
    expect(grid(run("power", A, "", { exponent: 0 }).output)[1]).toEqual(["0", "1", "0"]);
  });
  it("finds the characteristic polynomial", () => {
    expect(run("charpoly").output).toBe("det(λI − A) = λ^3 - 3/2·λ^2 - 49/2·λ - 18");
    expect(run("charpoly", "2 0\n0 3").output).toBe("det(λI − A) = λ^2 - 5·λ + 6");
  });
  it("solves linear systems: unique, none and infinite", () => {
    expect(run("solve", A, "1\n2\n3").output).toBe("x1 = 47/36\nx2 = -16/9\nx3 = 1/18");
    expect(run("solve", "1 1\n2 2", "1\n3").output).toMatch(/No solution/);
    expect(run("solve", "1 1\n2 2", "1\n2").output).toMatch(/Infinitely many solutions \(rank 1 of 2/);
    expect(run("solve", A, "1 2").error?.message).toMatch(/single column/);
  });
  it("transposes and scales by a fraction", () => {
    expect(grid(run("transpose", B).output)).toEqual([["1", "3", "5"], ["2", "4", "6"]]);
    expect(grid(run("scalar", "1 2\n3 4", "", { scalar: "1/2" }).output)).toEqual([["1/2", "1"], ["3/2", "2"]]);
  });
  it("shows decimals and both forms", () => {
    expect(run("determinant", "1 2\n3 4", "", { display: "decimal", decimals: 2 }).output).toBe("det(A) = -2.00");
    expect(grid(run("inverse", "3 0\n0 3", "", { display: "both", decimals: 3 }).output)[0]).toEqual(["1/3", "≈", "0.333", "0"]);
  });
  it("parses decimals, exponents and bad input", () => {
    expect(parseNumber("0.125")).toEqual(frac(1n, 8n));
    expect(parseNumber("1e-3")).toEqual(frac(1n, 1000n));
    expect(parseNumber("-.5")).toEqual(frac(-1n, 2n));
    expect(parseNumber("2.5e2")).toEqual(frac(250n));
    expect(fracToDecimal(frac(-2n, 3n), 8)).toBe("-0.66666667");
    expect(fracToDecimal(frac(1n, 3n), 0)).toBe("0");
    expect(run("determinant", "1 x\n3 4").error?.message).toMatch(/not a number/);
    expect(run("determinant", "1 2\n3").error?.message).toMatch(/row 2 has 1 entries/);
    expect(run("determinant", "")).toEqual({ output: "", error: null });
  });
  it("accepts semicolon and bracket syntax", () => {
    expect(run("determinant", "[1, 2; 3, 4]").output).toBe("det(A) = -2");
  });
});
