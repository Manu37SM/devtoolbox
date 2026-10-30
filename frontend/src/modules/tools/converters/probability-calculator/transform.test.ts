import { describe, expect, it } from "vitest";
import { calculateProbability, erfc, lgamma, nCr, nPr, normInv } from "./transform";

// Expected values come from scipy.stats (scipy 1.18).
const result = (input: string, o: Record<string, unknown>) => {
  const r = calculateProbability(input, { significantDigits: 14, ...o });
  expect(r.error).toBeNull();
  const line = r.output.split("\n").find((l) => /^(P\(|f\(|x where|smallest)/.test(l))!;
  return Number(/ = (-?[\d.]+(?:e[+-]?\d+)?)(?: |$)/.exec(line.slice(line.lastIndexOf(" = ")))![1]);
};
const near = (got: number, want: number, rel = 1e-9) => expect(Math.abs(got - want)).toBeLessThanOrEqual(Math.abs(want) * rel + 1e-300);

describe("probability calculator", () => {
  it("binomial", () => {
    near(result("n=10, p=0.3", { distribution: "binomial", query: "eq", x: 3 }), 0.2668279319999998);
    near(result("n=50, p=0.2", { distribution: "binomial", query: "le", x: 15 }), 0.9691965772179523);
    near(result("n=50, p=0.2", { distribution: "binomial", query: "gt", x: 15 }), 0.030803422782047694);
    near(result("n=100, p=0.25", { distribution: "binomial", query: "between", x: 20, x2: 30 }), 0.796682350938599);
    expect(result("n=100, p=0.3", { distribution: "binomial", query: "quantile", x: 0.9 })).toBe(36);
  });
  it("poisson, geometric and hypergeometric", () => {
    near(result("lambda=4.5", { distribution: "poisson", query: "eq", x: 7 }), 0.08236294962723255);
    near(result("lambda=4.5", { distribution: "poisson", query: "le", x: 7 }), 0.913413528352644);
    near(result("lambda=12", { distribution: "poisson", query: "ge", x: 15 }), 0.2279754676964551);
    expect(result("lambda=10", { distribution: "poisson", query: "quantile", x: 0.5 })).toBe(10);
    near(result("p=0.2", { distribution: "geometric", query: "eq", x: 5 }), 0.08192);
    near(result("p=0.2", { distribution: "geometric", query: "le", x: 5 }), 0.67232);
    near(result("population=50, successes=10, draws=8", { distribution: "hypergeometric", query: "eq", x: 2 }), 0.32172465789056803);
    near(result("population=50, successes=10, draws=8", { distribution: "hypergeometric", query: "le", x: 2 }), 0.8122270926586482);
  });
  it("normal, including far tails and quantiles", () => {
    near(result("mu=100, sigma=15", { distribution: "normal", query: "le", x: 130 }), 0.9772498680518208);
    near(result("mu=0, sigma=1", { distribution: "normal", query: "gt", x: 6 }), 9.865876450376946e-10);
    near(result("mu=0, sigma=1", { distribution: "normal", query: "le", x: -3 }), 0.0013498980316300933);
    near(result("mu=5, sigma=2", { distribution: "normal", query: "eq", x: 6 }), 0.17603266338214973);
    near(result("mu=0, sigma=1", { distribution: "normal", query: "quantile", x: 0.975 }), 1.959963984540054);
    near(result("mu=0, sigma=1", { distribution: "normal", query: "quantile", x: 1e-10 }), -6.361340902404056);
    near(result("mu=100, sigma=15", { distribution: "normal", query: "quantile", x: 0.9 }), 119.22327348316901);
    expect(calculateProbability("mu=100, sigma=15", { distribution: "normal", x: 130 }).output).toContain("z-score of x = 2");
  });
  it("exponential and uniform", () => {
    near(result("lambda=0.5", { distribution: "exponential", query: "le", x: 3 }), 0.7768698398515702);
    near(result("lambda=0.5", { distribution: "exponential", query: "quantile", x: 0.5 }), 1.3862943611198906);
    near(result("a=0, b=10", { distribution: "uniform", query: "between", x: 2, x2: 7 }), 0.5);
  });
  it("special functions are accurate", () => {
    near(erfc(0.5), 0.4795001221869535, 1e-14);
    near(erfc(3), 2.209049699858544e-5, 1e-12);
    near(lgamma(10.5), 13.940625219403763, 1e-13);
    near(normInv(0.975), 1.959963984540054, 1e-14);
    near(normInv(1e-300), -37.0471, 1e-5);
  });
  it("combinatorics uses exact big integers", () => {
    expect(nCr(52, 5)).toBe(2598960n);
    expect(nPr(10, 3)).toBe(720n);
    const out = calculateProbability("n=20, k=3", { distribution: "combinatorics" }).output;
    expect(out).toContain("n! = 2432902008176640000");
    expect(out).toContain("C(n, k) = n!/(k!(n−k)!) = 1140");
    expect(out).toContain("Combinations with repetition = 1540");
    expect(out).toContain("Permutations with repetition = 8000");
  });
  it("shows mean and standard deviation, and validates input", () => {
    expect(calculateProbability("n=10, p=0.5", { distribution: "binomial", query: "eq", x: 5 }).output).toContain("Mean = 5, variance = 2.5");
    expect(calculateProbability("n=10, p=1.5", {}).error?.message).toMatch(/between 0 and 1/);
    expect(calculateProbability("n=10", {}).error?.message).toMatch(/Missing "p"/);
    expect(calculateProbability("hello", {}).error?.message).toMatch(/Cannot read/);
    expect(calculateProbability("mu=0, sigma=0", { distribution: "normal" }).error?.message).toMatch(/positive/);
    expect(calculateProbability("n=10, p=0.5", { distribution: "binomial", query: "quantile", x: 2 }).error?.message).toMatch(/strictly between/);
    expect(calculateProbability("", {})).toEqual({ output: "", error: null });
  });
});
