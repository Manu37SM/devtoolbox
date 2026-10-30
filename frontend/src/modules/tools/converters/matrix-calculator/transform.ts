import type { TransformResult } from "@/lib/tool-transform";
import type { MatrixCalculatorOptions } from "./schema";

/** Exact rational number; d is always > 0 and the fraction is reduced. */
export interface Frac {
  n: bigint;
  d: bigint;
}
type Matrix = Frac[][];

const MAX = 12;
const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
};
export const frac = (n: bigint, d: bigint = 1n): Frac => {
  if (d === 0n) throw new Error("Division by zero");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
};
const ZERO = frac(0n);
const ONE = frac(1n);
const add = (a: Frac, b: Frac) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Frac, b: Frac) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d);
const div = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n);
const neg = (a: Frac) => frac(-a.n, a.d);
const isZero = (a: Frac) => a.n === 0n;

export function parseNumber(token: string): Frac {
  const t = token.trim();
  const slash = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(t);
  if (slash) return frac(BigInt(slash[1]!), BigInt(slash[2]!));
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(t);
  if (!m || (m[2] === "" && (m[3] ?? "") === "")) throw new Error(`"${token}" is not a number or fraction`);
  const digits = (m[2] ?? "") + (m[3] ?? "");
  let n = BigInt(digits || "0");
  let scale = BigInt((m[3] ?? "").length);
  const exp = m[4] ? Number(m[4]) : 0;
  if (Math.abs(exp) > 60) throw new Error(`The exponent in "${token}" is too large`);
  scale -= BigInt(exp);
  if (m[1] === "-") n = -n;
  return scale >= 0n ? frac(n, 10n ** scale) : frac(n * 10n ** -scale);
}

export function parseMatrix(text: string, label: string): Matrix {
  const rows = text
    .split(/\r?\n|;|\|/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.replace(/^\[|\]$/g, "").trim().split(/[\s,]+/).filter(Boolean));
  if (!rows.length) throw new Error(`Matrix ${label} is empty`);
  const width = rows[0]!.length;
  rows.forEach((r, i) => {
    if (r.length !== width) throw new Error(`Matrix ${label}: row ${i + 1} has ${r.length} entries but row 1 has ${width}`);
  });
  if (rows.length > MAX || width > MAX) throw new Error(`Matrix ${label} is larger than ${MAX}×${MAX}`);
  return rows.map((r) => r.map(parseNumber));
}

const identity = (n: number): Matrix => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? ONE : ZERO)));
const rowsOf = (m: Matrix) => m.length;
const colsOf = (m: Matrix) => m[0]!.length;
const transpose = (m: Matrix): Matrix => m[0]!.map((_, j) => m.map((r) => r[j]!));
const matMul = (a: Matrix, b: Matrix): Matrix => {
  if (colsOf(a) !== rowsOf(b)) throw new Error(`Cannot multiply a ${rowsOf(a)}×${colsOf(a)} matrix by a ${rowsOf(b)}×${colsOf(b)} matrix`);
  return a.map((row) => b[0]!.map((_, j) => row.reduce((s, x, k) => add(s, mul(x, b[k]![j]!)), ZERO)));
};
const mapM = (a: Matrix, f: (x: Frac) => Frac): Matrix => a.map((r) => r.map(f));

/** Row-reduces a copy of m; returns RREF, the pivot columns, and the determinant factor for square use. */
function rref(m: Matrix, limitCols = colsOf(m)): { rows: Matrix; pivots: number[]; det: Frac } {
  const a = m.map((r) => r.slice());
  const pivots: number[] = [];
  let det = ONE;
  let r = 0;
  for (let c = 0; c < limitCols && r < a.length; c++) {
    let p = r;
    while (p < a.length && isZero(a[p]![c]!)) p++;
    if (p === a.length) {
      det = ZERO;
      continue;
    }
    if (p !== r) {
      [a[p], a[r]] = [a[r]!, a[p]!];
      det = neg(det);
    }
    const pivot = a[r]![c]!;
    det = mul(det, pivot);
    a[r] = a[r]!.map((x) => div(x, pivot));
    for (let i = 0; i < a.length; i++) {
      if (i === r || isZero(a[i]![c]!)) continue;
      const f = a[i]![c]!;
      a[i] = a[i]!.map((x, j) => sub(x, mul(f, a[r]![j]!)));
    }
    pivots.push(c);
    r++;
  }
  if (pivots.length < Math.min(a.length, limitCols)) det = ZERO;
  return { rows: a, pivots, det };
}

export function determinant(m: Matrix): Frac {
  if (rowsOf(m) !== colsOf(m)) throw new Error("The determinant needs a square matrix");
  return rref(m).det;
}

export function inverse(m: Matrix): Matrix {
  if (rowsOf(m) !== colsOf(m)) throw new Error("The inverse needs a square matrix");
  const n = rowsOf(m);
  const aug = m.map((r, i) => [...r, ...identity(n)[i]!]);
  const { rows, pivots } = rref(aug, n);
  if (pivots.length < n) throw new Error("The matrix is singular (determinant 0), so it has no inverse");
  return rows.map((r) => r.slice(n));
}

/** Coefficients of det(λI − A), highest power first, by the exact Faddeev–LeVerrier algorithm. */
export function charPoly(m: Matrix): Frac[] {
  if (rowsOf(m) !== colsOf(m)) throw new Error("The characteristic polynomial needs a square matrix");
  const n = rowsOf(m);
  const coeffs: Frac[] = [ONE];
  let mk: Matrix = identity(n);
  let ck = ONE;
  for (let k = 1; k <= n; k++) {
    const am = matMul(m, mk);
    const tr = am.reduce((s, r, i) => add(s, r[i]!), ZERO);
    ck = neg(div(tr, frac(BigInt(k))));
    coeffs.push(ck);
    mk = am.map((r, i) => r.map((x, j) => (i === j ? add(x, ck) : x)));
  }
  return coeffs;
}

export function fracToString(f: Frac): string {
  return f.d === 1n ? f.n.toString() : `${f.n}/${f.d}`;
}
export function fracToDecimal(f: Frac, digits: number): string {
  const neg = f.n < 0n;
  const scale = 10n ** BigInt(digits);
  const abs = neg ? -f.n : f.n;
  let q = (abs * scale * 2n + f.d) / (f.d * 2n); // round half up
  if (q === 0n) return digits ? `0.${"0".repeat(digits)}` : "0";
  const s = q.toString().padStart(digits + 1, "0");
  const out = digits ? `${s.slice(0, -digits)}.${s.slice(-digits)}` : s;
  q = 0n;
  return (neg ? "-" : "") + out;
}

function show(f: Frac, o: MatrixCalculatorOptions): string {
  if (o.display === "fraction") return fracToString(f);
  if (o.display === "decimal") return fracToDecimal(f, o.decimals);
  return f.d === 1n ? fracToString(f) : `${fracToString(f)} ≈ ${fracToDecimal(f, o.decimals)}`;
}
function showMatrix(m: Matrix, o: MatrixCalculatorOptions): string {
  const cells = m.map((r) => r.map((x) => show(x, o)));
  const w = Math.max(...cells.flat().map((s) => s.length));
  return cells.map((r) => `[ ${r.map((s) => s.padStart(w)).join("  ")} ]`).join("\n");
}

export function calculateMatrix(a: string, b: string, options: Partial<MatrixCalculatorOptions>): TransformResult {
  const o: MatrixCalculatorOptions = {
    operation: options.operation ?? "determinant",
    exponent: options.exponent ?? 2,
    scalar: options.scalar ?? "2",
    display: options.display ?? "fraction",
    decimals: options.decimals ?? 6,
  };
  if (!a.trim()) return { output: "", error: null };
  try {
    const A = parseMatrix(a, "A");
    const needB = ["multiply", "add", "subtract", "solve"].includes(o.operation);
    const B = needB ? parseMatrix(b, "B") : null;
    const out = (s: string) => ({ output: s, error: null });
    switch (o.operation) {
      case "determinant":
        return out(`det(A) = ${show(determinant(A), o)}`);
      case "trace": {
        if (rowsOf(A) !== colsOf(A)) throw new Error("The trace needs a square matrix");
        return out(`tr(A) = ${show(A.reduce((s, r, i) => add(s, r[i]!), ZERO), o)}`);
      }
      case "rank":
        return out(`rank(A) = ${rref(A).pivots.length}`);
      case "transpose":
        return out(showMatrix(transpose(A), o));
      case "inverse":
        return out(showMatrix(inverse(A), o));
      case "rref": {
        const r = rref(A);
        return out(`${showMatrix(r.rows, o)}\n\nrank ${r.pivots.length}, pivot columns ${r.pivots.map((p) => p + 1).join(", ") || "none"}`);
      }
      case "multiply":
        return out(showMatrix(matMul(A, B!), o));
      case "add":
      case "subtract": {
        if (rowsOf(A) !== rowsOf(B!) || colsOf(A) !== colsOf(B!)) throw new Error(`A is ${rowsOf(A)}×${colsOf(A)} but B is ${rowsOf(B!)}×${colsOf(B!)}; the sizes must match`);
        const f = o.operation === "add" ? add : sub;
        return out(showMatrix(A.map((r, i) => r.map((x, j) => f(x, B![i]![j]!))), o));
      }
      case "scalar": {
        const k = parseNumber(o.scalar);
        return out(showMatrix(mapM(A, (x) => mul(x, k)), o));
      }
      case "power": {
        if (rowsOf(A) !== colsOf(A)) throw new Error("A power needs a square matrix");
        let base = o.exponent < 0 ? inverse(A) : A;
        let e = Math.abs(o.exponent);
        let result = identity(rowsOf(A));
        while (e > 0) {
          if (e & 1) result = matMul(result, base);
          e = Math.floor(e / 2);
          if (e) base = matMul(base, base);
        }
        return out(showMatrix(result, o));
      }
      case "charpoly": {
        const c = charPoly(A);
        const n = c.length - 1;
        const terms = c
          .map((x, i) => ({ x, p: n - i }))
          .filter(({ x }) => !isZero(x))
          .map(({ x, p }, idx) => {
            const sign = x.n < 0n ? "-" : "+";
            const mag = frac(x.n < 0n ? -x.n : x.n, x.d);
            const coef = p > 0 && mag.n === 1n && mag.d === 1n ? "" : show(mag, { ...o, display: o.display === "decimal" ? "decimal" : "fraction" });
            const v = p === 0 ? "" : p === 1 ? "λ" : `λ^${p}`;
            const body = coef + (coef && v ? "·" : "") + v || "1";
            return idx === 0 ? (sign === "-" ? `-${body}` : body) : ` ${sign} ${body}`;
          });
        return out(`det(λI − A) = ${terms.join("") || "0"}`);
      }
      case "solve": {
        const rowsA = rowsOf(A);
        if (colsOf(B!) !== 1 || rowsOf(B!) !== rowsA) throw new Error(`B must be a single column with ${rowsA} entries (the right-hand side)`);
        const n = colsOf(A);
        const aug = A.map((r, i) => [...r, B![i]![0]!]);
        const { rows, pivots } = rref(aug, n);
        const rank = pivots.length;
        if (rows.slice(rank).some((r) => !isZero(r[n]!))) return out("No solution: the equations contradict each other.");
        if (rank < n) {
          const free = Array.from({ length: n }, (_, j) => j).filter((j) => !pivots.includes(j));
          return out(`Infinitely many solutions (rank ${rank} of ${n} unknowns).\nFree variables: ${free.map((j) => `x${j + 1}`).join(", ")}\nReduced system:\n${showMatrix(rows.slice(0, rank), o)}`);
        }
        const x = Array.from({ length: n }, (_, j) => rows[pivots.indexOf(j)]![n]!);
        return out(x.map((v, j) => `x${j + 1} = ${show(v, o)}`).join("\n"));
      }
    }
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
