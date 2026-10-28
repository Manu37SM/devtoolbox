import type { TransformResult } from "@/lib/tool-transform";
import type { StatisticsCalculatorOptions } from "./schema";

/** Linear-interpolation percentile (NumPy default / Excel PERCENTILE.INC). */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0]!;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (rank - lo);
}

export function modes(values: number[]): number[] {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const max = Math.max(...counts.values());
  if (max === 1) return [];
  return [...counts].filter(([, c]) => c === max).map(([v]) => v).sort((a, b) => a - b);
}

export function describeData(values: number[]) {
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const ss = values.reduce((a, v) => a + (v - mean) ** 2, 0);
  const popVar = ss / n;
  const sampVar = n > 1 ? ss / (n - 1) : NaN;
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const m3 = values.reduce((a, v) => a + (v - mean) ** 3, 0) / n;
  const skew = popVar > 0 ? m3 / popVar ** 1.5 : NaN;
  const positive = values.every((v) => v > 0);
  return {
    n, sum, mean, sorted,
    median: percentile(sorted, 50),
    min: sorted[0]!, max: sorted[n - 1]!,
    popVar, sampVar, popSd: Math.sqrt(popVar), sampSd: Math.sqrt(sampVar),
    q1, q3, iqr,
    sem: n > 1 ? Math.sqrt(sampVar) / Math.sqrt(n) : NaN,
    skew,
    geo: positive ? Math.exp(values.reduce((a, v) => a + Math.log(v), 0) / n) : NaN,
    harm: positive ? n / values.reduce((a, v) => a + 1 / v, 0) : NaN,
    outliers: sorted.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr),
    modes: modes(values),
  };
}

export function calculateStatistics(input: string, options: StatisticsCalculatorOptions): TransformResult {
  const tokens = input.split(/[\s,;]+/).filter(Boolean);
  if (!tokens.length) return { output: "", error: null };
  const values: number[] = [];
  for (const t of tokens) {
    const v = Number(t);
    if (!Number.isFinite(v)) return { output: "", error: { message: `"${t}" is not a number` } };
    values.push(v);
  }
  const s = describeData(values);
  const f = (x: number) => (Number.isFinite(x) ? String(Number(x.toFixed(options.decimals))) : "n/a");
  const rows: Array<[string, string]> = [
    ["Count", String(s.n)],
    ["Sum", f(s.sum)],
    ["Mean", f(s.mean)],
    ["Median", f(s.median)],
    ["Mode", s.modes.length ? s.modes.map(f).join(", ") : "none (all values unique)"],
    ["Min", f(s.min)],
    ["Max", f(s.max)],
    ["Range", f(s.max - s.min)],
    ["Variance (population)", f(s.popVar)],
    ["Variance (sample)", f(s.sampVar)],
    ["Std deviation (population)", f(s.popSd)],
    ["Std deviation (sample)", f(s.sampSd)],
    ["Std error of the mean", f(s.sem)],
    ["Q1 (25th percentile)", f(s.q1)],
    ["Q3 (75th percentile)", f(s.q3)],
    ["IQR", f(s.iqr)],
    [`P${options.percentile}`, f(percentile(s.sorted, options.percentile))],
    ["Skewness", f(s.skew)],
    ["Geometric mean", f(s.geo)],
    ["Harmonic mean", f(s.harm)],
    ["Outliers (1.5×IQR)", s.outliers.length ? s.outliers.map(f).join(", ") : "none"],
  ];
  const w = Math.max(...rows.map(([k]) => k.length));
  return { output: rows.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join("\n"), error: null };
}
