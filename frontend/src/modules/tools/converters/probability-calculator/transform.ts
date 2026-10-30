import type { TransformResult } from "@/lib/tool-transform";
import type { Distribution, ProbabilityCalculatorOptions } from "./schema";

// ---- special functions ----------------------------------------------------

const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

/** ln Γ(x) for x > 0 (Lanczos, relative error ~1e-15). */
export function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = LANCZOS[0]!;
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i]! / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

const lchoose = (n: number, k: number) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);

/** erf(x) for |x| < ~6 by the all-positive series e^{-x²}·2/√π·Σ 2ⁿx²ⁿ⁺¹/(2n+1)!!. */
function erfSeries(x: number): number {
  let term = x;
  let sum = x;
  for (let n = 1; n < 200; n++) {
    term *= (2 * x * x) / (2 * n + 1);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-17) break;
  }
  return (2 / Math.sqrt(Math.PI)) * Math.exp(-x * x) * sum;
}

/** erfc(x) for x ≥ 0 via its continued fraction (accurate in the tail). */
function erfcTail(x: number): number {
  let f = 0;
  for (let k = 80; k >= 1; k--) f = k / 2 / (x + f);
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / (x + f);
}

export function erfc(x: number): number {
  if (x < 0) return 2 - erfc(-x);
  return x < 2.5 ? 1 - erfSeries(x) : erfcTail(x);
}

/** Standard normal CDF and its upper tail, each accurate in its own tail. */
export const normCdf = (z: number) => 0.5 * erfc(-z / Math.SQRT2);
export const normSf = (z: number) => 0.5 * erfc(z / Math.SQRT2);
const normPdf = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  let x: number;
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  } else if (p > 1 - 0.02425) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  } else {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  for (let i = 0; i < 3; i++) {
    const err = (x > 0 ? 1 - normSf(x) : normCdf(x)) - p;
    const u = err / normPdf(x);
    x -= u / (1 + (x * u) / 2); // Halley step
  }
  return x;
}

// ---- discrete distributions ---------------------------------------------

interface Discrete {
  support: [number, number];
  pmf: (k: number) => number;
  mean: number;
  variance: number;
}

function binomial(n: number, p: number): Discrete {
  return {
    support: [0, n],
    pmf: (k) => (k < 0 || k > n ? 0 : p === 0 ? (k === 0 ? 1 : 0) : p === 1 ? (k === n ? 1 : 0) : Math.exp(lchoose(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p))),
    mean: n * p,
    variance: n * p * (1 - p),
  };
}
const poisson = (l: number): Discrete => ({ support: [0, Infinity], pmf: (k) => (k < 0 ? 0 : Math.exp(k * Math.log(l) - l - lgamma(k + 1))), mean: l, variance: l });
const geometric = (p: number): Discrete => ({ support: [1, Infinity], pmf: (k) => (k < 1 ? 0 : Math.exp((k - 1) * Math.log1p(-p) + Math.log(p))), mean: 1 / p, variance: (1 - p) / (p * p) });
function hypergeometric(N: number, K: number, n: number): Discrete {
  const lo = Math.max(0, n - (N - K));
  const hi = Math.min(n, K);
  return { support: [lo, hi], pmf: (k) => (k < lo || k > hi ? 0 : Math.exp(lchoose(K, k) + lchoose(N - K, n - k) - lchoose(N, n))), mean: (n * K) / N, variance: n * (K / N) * (1 - K / N) * ((N - n) / (N - 1)) };
}

// ---- parameter parsing ----------------------------------------------------

function params(input: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of input.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)) {
    const m = /^([A-Za-zμσλ]+)\s*[=:]?\s*(-?\d*\.?\d+(?:[eE][+-]?\d+)?)$/.exec(part);
    if (!m) throw new Error(`Cannot read "${part}". Write parameters like n=10, p=0.3.`);
    out[m[1]!.toLowerCase().replace("μ", "mu").replace("σ", "sigma").replace("λ", "lambda")] = Number(m[2]);
  }
  return out;
}
function need(p: Record<string, number>, names: string[], dist: string): number[] {
  return names.map((n) => {
    const alias = n === "lambda" ? p.lambda ?? p.rate ?? p.l : n === "mu" ? p.mu ?? p.mean : n === "sigma" ? p.sigma ?? p.sd ?? p.std : p[n];
    if (alias === undefined) throw new Error(`${dist} needs ${names.join(", ")}. Missing "${n}".`);
    return alias;
  });
}

const sig = (x: number, d: number) => (x === 0 ? "0" : Number(x.toPrecision(d)).toString().replace(/^(-?)0\.0{5,}/, (m) => m));
const fmt = (x: number, d: number) => {
  if (!Number.isFinite(x)) return String(x);
  const s = Number(x.toPrecision(d));
  return Math.abs(s) !== 0 && (Math.abs(s) < 1e-5 || Math.abs(s) >= 1e15) ? s.toExponential(Math.max(0, d - 1)) : sig(x, d);
};

export function nCr(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  k = Math.min(k, n - k);
  let r = 1n;
  for (let i = 1; i <= k; i++) r = (r * BigInt(n - k + i)) / BigInt(i);
  return r;
}
export function nPr(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  let r = 1n;
  for (let i = 0; i < k; i++) r *= BigInt(n - i);
  return r;
}
const factorial = (n: number) => nPr(n, n);

export function calculateProbability(input: string, options: Partial<ProbabilityCalculatorOptions>): TransformResult {
  const o: ProbabilityCalculatorOptions = {
    distribution: options.distribution ?? "binomial",
    query: options.query ?? "le",
    x: options.x ?? 3,
    x2: options.x2 ?? 6,
    significantDigits: options.significantDigits ?? 8,
  };
  if (!input.trim()) return { output: "", error: null };
  const d = o.significantDigits;
  try {
    const p = params(input);
    const dist: Distribution = o.distribution;
    if (dist === "combinatorics") {
      const [n, k] = need(p, ["n", "k"], "Combinatorics") as [number, number];
      if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || n > 5000) throw new Error("n and k must be whole numbers, n between 0 and 5000");
      return { output: [`n! = ${factorial(n)}`, `P(n, k) = n!/(n−k)! = ${nPr(n, k)}`, `C(n, k) = n!/(k!(n−k)!) = ${nCr(n, k)}`, `Combinations with repetition = ${nCr(n + k - 1, k)}`, `Permutations with repetition = ${BigInt(n) ** BigInt(k)}`].join("\n"), error: null };
    }

    const lines: string[] = [];
    const x = o.x;
    const q = o.query;
    let prob: number;
    let label: string;

    if (dist === "normal" || dist === "exponential" || dist === "uniform") {
      let cdf: (v: number) => number;
      let sf: (v: number) => number;
      let pdf: (v: number) => number;
      let inv: (pr: number) => number;
      let mean: number;
      let variance: number;
      if (dist === "normal") {
        const [mu, sigma] = need(p, ["mu", "sigma"], "Normal") as [number, number];
        if (!(sigma > 0)) throw new Error("sigma must be positive");
        cdf = (v) => normCdf((v - mu) / sigma);
        sf = (v) => normSf((v - mu) / sigma);
        pdf = (v) => normPdf((v - mu) / sigma) / sigma;
        inv = (pr) => mu + sigma * normInv(pr);
        [mean, variance] = [mu, sigma * sigma];
        lines.push(`Normal(μ=${mu}, σ=${sigma})`);
        if (q !== "quantile") lines.push(`z-score of x = ${fmt((x - mu) / sigma, d)}`);
      } else if (dist === "exponential") {
        const [l] = need(p, ["lambda"], "Exponential") as [number];
        if (!(l > 0)) throw new Error("lambda must be positive");
        cdf = (v) => (v <= 0 ? 0 : -Math.expm1(-l * v));
        sf = (v) => (v <= 0 ? 1 : Math.exp(-l * v));
        pdf = (v) => (v < 0 ? 0 : l * Math.exp(-l * v));
        inv = (pr) => -Math.log1p(-pr) / l;
        [mean, variance] = [1 / l, 1 / (l * l)];
        lines.push(`Exponential(λ=${l})`);
      } else {
        const [a, b] = need(p, ["a", "b"], "Uniform") as [number, number];
        if (!(b > a)) throw new Error("b must be greater than a");
        cdf = (v) => Math.min(1, Math.max(0, (v - a) / (b - a)));
        sf = (v) => 1 - cdf(v);
        pdf = (v) => (v < a || v > b ? 0 : 1 / (b - a));
        inv = (pr) => a + pr * (b - a);
        [mean, variance] = [(a + b) / 2, ((b - a) ** 2) / 12];
        lines.push(`Uniform(a=${a}, b=${b})`);
      }
      if (q === "eq") [prob, label] = [pdf(x), `f(${x}) (density)`];
      else if (q === "le" || q === "lt") [prob, label] = [cdf(x), `P(X ${q === "le" ? "≤" : "<"} ${x})`];
      else if (q === "ge" || q === "gt") [prob, label] = [sf(x), `P(X ${q === "ge" ? "≥" : ">"} ${x})`];
      else if (q === "between") {
        if (o.x2 < x) throw new Error("The upper bound must not be below the lower bound");
        [prob, label] = [x > mean ? sf(x) - sf(o.x2) : cdf(o.x2) - cdf(x), `P(${x} ≤ X ≤ ${o.x2})`];
      } else {
        if (!(x > 0 && x < 1)) throw new Error("For a quantile enter a probability strictly between 0 and 1 as x");
        [prob, label] = [inv(x), `x where P(X ≤ x) = ${x}`];
      }
      lines.push(`${label} = ${fmt(prob, d)}`);
      if (q !== "quantile" && q !== "eq" && prob > 0 && prob < 1) lines.push(`= ${fmt(prob * 100, d)} %  (about 1 in ${fmt(1 / prob, 4)})`);
      lines.push(`Mean = ${fmt(mean, d)}, variance = ${fmt(variance, d)}, standard deviation = ${fmt(Math.sqrt(variance), d)}`);
      return { output: lines.join("\n"), error: null };
    }

    let dd: Discrete;
    if (dist === "binomial") {
      const [n, pr] = need(p, ["n", "p"], "Binomial") as [number, number];
      if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw new Error("n must be a whole number from 0 to 1,000,000");
      if (!(pr >= 0 && pr <= 1)) throw new Error("p must be between 0 and 1");
      dd = binomial(n, pr);
      lines.push(`Binomial(n=${n}, p=${pr})`);
    } else if (dist === "poisson") {
      const [l] = need(p, ["lambda"], "Poisson") as [number];
      if (!(l > 0) || l > 1_000_000) throw new Error("lambda must be positive (at most 1,000,000)");
      dd = poisson(l);
      lines.push(`Poisson(λ=${l})`);
    } else if (dist === "geometric") {
      const [pr] = need(p, ["p"], "Geometric") as [number];
      if (!(pr > 0 && pr <= 1)) throw new Error("p must be greater than 0 and at most 1");
      dd = geometric(pr);
      lines.push(`Geometric(p=${pr}) — number of trials up to and including the first success`);
    } else {
      const [N, K, n] = need(p, ["population", "successes", "draws"], "Hypergeometric") as [number, number, number];
      if (![N, K, n].every(Number.isInteger) || K > N || n > N || K < 0 || n < 0) throw new Error("population, successes and draws must be whole numbers with successes ≤ population and draws ≤ population");
      dd = hypergeometric(N, K, n);
      lines.push(`Hypergeometric(population=${N}, successes=${K}, draws=${n})`);
    }
    const [lo, hi] = dd.support;
    const sum = (a: number, b: number) => {
      let s = 0;
      for (let k = Math.max(a, lo); k <= Math.min(b, hi, a + 5_000_000); k++) s += dd.pmf(k);
      return Math.min(1, s);
    };
    const kk = Math.floor(x);
    if (q !== "quantile" && !Number.isInteger(x) && q === "eq") throw new Error("x must be a whole number for a discrete distribution");
    const top = Number.isFinite(hi) ? hi : Math.ceil(dd.mean + 60 * Math.sqrt(dd.variance) + 60);
    if (q === "eq") [prob, label] = [dd.pmf(x), `P(X = ${x})`];
    else if (q === "le") [prob, label] = [sum(lo, kk), `P(X ≤ ${x})`];
    else if (q === "lt") [prob, label] = [sum(lo, Math.ceil(x) - 1), `P(X < ${x})`];
    else if (q === "ge") [prob, label] = [sum(Math.ceil(x), top), `P(X ≥ ${x})`];
    else if (q === "gt") [prob, label] = [sum(kk + 1, top), `P(X > ${x})`];
    else if (q === "between") [prob, label] = [sum(Math.ceil(x), Math.floor(o.x2)), `P(${x} ≤ X ≤ ${o.x2})`];
    else {
      if (!(x > 0 && x < 1)) throw new Error("For a quantile enter a probability strictly between 0 and 1 as x");
      let acc = 0;
      let k = lo;
      for (; k <= top; k++) {
        acc += dd.pmf(k);
        if (acc >= x * (1 - 1e-12)) break;
      }
      [prob, label] = [k, `smallest k with P(X ≤ k) ≥ ${x}`];
    }
    lines.push(`${label} = ${fmt(prob, d)}`);
    if (q !== "quantile" && prob > 0 && prob < 1) lines.push(`= ${fmt(prob * 100, d)} %  (about 1 in ${fmt(1 / prob, 4)})`);
    lines.push(`Mean = ${fmt(dd.mean, d)}, variance = ${fmt(dd.variance, d)}, standard deviation = ${fmt(Math.sqrt(dd.variance), d)}`);
    return { output: lines.join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
