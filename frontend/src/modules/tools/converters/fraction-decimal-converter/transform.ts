import type { TransformResult } from "@/lib/tool-transform";
import type { FractionDecimalConverterOptions } from "./schema";

const gcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };

export interface Frac { n: bigint; d: bigint }
const norm = (n: bigint, d: bigint): Frac => { if (d === 0n) throw new Error("Division by zero"); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };

/** Parses "3/4", "1 3/4", "-2.5", "0.125", "12%", "1.5e-3" into an exact fraction. */
export function parseValue(text: string): Frac {
  const s = text.trim().replace(/,/g, "");
  let m = /^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (m) { const w = BigInt(m[2]!), n = BigInt(m[3]!), d = BigInt(m[4]!); const f = norm(w * d + n, d); return m[1] ? { n: -f.n, d: f.d } : f; }
  m = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(s);
  if (m) return norm(BigInt(m[1]!), BigInt(m[2]!));
  m = /^(-?)(\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?(%?)$/.exec(s);
  if (m && (m[2] || m[3])) {
    const frac = m[3] ?? "";
    let n = BigInt((m[2] || "0") + frac), d = 10n ** BigInt(frac.length);
    const exp = m[4] ? Number(m[4]) : 0;
    if (Math.abs(exp) > 60) throw new Error("Exponent too large");
    if (exp > 0) n *= 10n ** BigInt(exp); else d *= 10n ** BigInt(-exp);
    if (m[5]) d *= 100n;
    const f = norm(m[1] ? -n : n, d);
    return f;
  }
  throw new Error(`Cannot read "${text.trim()}" as a number or fraction`);
}

/** Closest fraction with denominator <= max via continued fractions (best rational approximation). */
export function approximate(f: Frac, max: bigint): Frac {
  if (f.d <= max) return f;
  const neg = f.n < 0n;
  let n = neg ? -f.n : f.n, d = f.d;
  let [p0, q0, p1, q1] = [0n, 1n, 1n, 0n];
  while (d !== 0n) {
    const a = n / d;
    const p2 = a * p1 + p0, q2 = a * q1 + q0;
    if (q2 > max) {
      const k = (max - q0) / q1;
      const cand = { n: k * p1 + p0, d: k * q1 + q0 };
      const prev = { n: p1, d: q1 };
      // choose whichever of the semiconvergent and previous convergent is closer
      const err = (c: Frac) => { const x = c.n * f.d - (neg ? -f.n : f.n) * c.d; return (x < 0n ? -x : x) * 1n / c.d; };
      const best = k > 0n && err(cand) < err(prev) ? cand : prev;
      return norm(neg ? -best.n : best.n, best.d);
    }
    [p0, q0, p1, q1] = [p1, q1, p2, q2];
    [n, d] = [d, n % d];
  }
  return norm(neg ? -p1 : p1, q1);
}

/** Decimal expansion with repeating part detected, e.g. 1/3 -> 0.(3). */
export function toDecimal(f: Frac, precision: number): { text: string; repeating: boolean; exact: boolean } {
  const neg = f.n < 0n;
  const n = neg ? -f.n : f.n;
  const whole = n / f.d;
  let rem = n % f.d;
  const digits: string[] = [];
  const seen = new Map<bigint, number>();
  let repeatAt = -1;
  while (rem !== 0n && digits.length < precision) {
    if (seen.has(rem)) { repeatAt = seen.get(rem)!; break; }
    seen.set(rem, digits.length);
    rem *= 10n;
    digits.push((rem / f.d).toString());
    rem %= f.d;
  }
  const sign = neg ? "-" : "";
  if (rem === 0n) return { text: `${sign}${whole}${digits.length ? "." + digits.join("") : ""}`, repeating: false, exact: true };
  if (repeatAt >= 0) return { text: `${sign}${whole}.${digits.slice(0, repeatAt).join("")}(${digits.slice(repeatAt).join("")})`, repeating: true, exact: true };
  return { text: `${sign}${whole}.${digits.join("")}…`, repeating: false, exact: false };
}

const show = (f: Frac, mixed: boolean) => {
  if (f.d === 1n) return `${f.n}`;
  const neg = f.n < 0n, n = neg ? -f.n : f.n;
  if (mixed && n > f.d) return `${neg ? "-" : ""}${n / f.d} ${n % f.d}/${f.d}`;
  return `${f.n}/${f.d}`;
};

export function convertFractions(input: string, o: FractionDecimalConverterOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const out: string[] = [];
  let firstErr: { message: string; line?: number } | null = null;
  lines.forEach((l, i) => {
    try {
      const exact = parseValue(l);
      const approx = approximate(exact, BigInt(o.maxDenominator));
      const rows: string[] = [];
      const approximated = approx.n !== exact.n || approx.d !== exact.d;
      rows.push(`Fraction:  ${show(approx, false)}${approximated ? `  (nearest with denominator ≤ ${o.maxDenominator})` : ""}`);
      if (o.mixed && approx.d !== 1n && (approx.n < 0n ? -approx.n : approx.n) > approx.d) rows.push(`Mixed:     ${show(approx, true)}`);
      const dec = toDecimal(exact, o.precision);
      rows.push(`Decimal:   ${dec.text}${dec.repeating ? "  (repeating)" : dec.exact ? "" : "  (rounded view)"}`);
      const pct = toDecimal({ n: exact.n * 100n, d: exact.d }, Math.min(o.precision, 8));
      rows.push(`Percent:   ${pct.text}%`);
      if (approximated) { const err = Number(approx.n) / Number(approx.d) - Number(exact.n) / Number(exact.d); rows.push(`Error:     ${err.toExponential(3)}`); }
      out.push(`${l}\n${rows.map((r) => "  " + r).join("\n")}`);
    } catch (e) {
      firstErr ??= { message: `Line ${i + 1}: ${(e as Error).message}`, line: i + 1 };
      out.push(`${l}\n  ✗ ${(e as Error).message}`);
    }
  });
  return { output: out.join("\n\n"), error: firstErr };
}
