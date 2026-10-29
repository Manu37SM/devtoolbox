import type { TransformResult } from "@/lib/tool-transform";
import type { BigdecimalRoundingOptions } from "./schema";

/** A java.math.BigDecimal-style value: unscaled * 10^-scale. */
export interface Dec { unscaled: bigint; scale: number }

export const MODES = ["UP", "DOWN", "CEILING", "FLOOR", "HALF_UP", "HALF_DOWN", "HALF_EVEN", "UNNECESSARY"] as const;
export type RoundingMode = (typeof MODES)[number];

export function parseDecimal(s: string): Dec | null {
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(s.trim().replace(/_/g, ""));
  if (!m || (m[2] === "" && (m[3] ?? "") === "")) return null;
  const frac = m[3] ?? "";
  const digits = `${m[2]}${frac}`.replace(/^0+(?=\d)/, "") || "0";
  const scale = frac.length - Number(m[4] ?? 0);
  const u = BigInt(digits);
  return { unscaled: m[1] === "-" ? -u : u, scale };
}

const pow10 = (n: number) => 10n ** BigInt(n);

/** BigDecimal.setScale(newScale, mode). Returns null where Java throws ArithmeticException. */
export function setScale(d: Dec, newScale: number, mode: RoundingMode): Dec | null {
  if (newScale >= d.scale) return { unscaled: d.unscaled * pow10(newScale - d.scale), scale: newScale };
  const div = pow10(d.scale - newScale);
  const neg = d.unscaled < 0n;
  const abs = neg ? -d.unscaled : d.unscaled;
  const q = abs / div, r = abs % div;
  if (r === 0n) return { unscaled: neg ? -q : q, scale: newScale };
  const twice = r * 2n;
  let up: boolean;
  switch (mode) {
    case "UP": up = true; break;
    case "DOWN": up = false; break;
    case "CEILING": up = !neg; break;
    case "FLOOR": up = neg; break;
    case "HALF_UP": up = twice >= div; break;
    case "HALF_DOWN": up = twice > div; break;
    case "HALF_EVEN": up = twice > div || (twice === div && q % 2n === 1n); break;
    case "UNNECESSARY": return null;
  }
  const mag = up ? q + 1n : q;
  return { unscaled: neg ? -mag : mag, scale: newScale };
}

/** BigDecimal.toPlainString(). */
export function toPlain(d: Dec): string {
  const neg = d.unscaled < 0n;
  let s = (neg ? -d.unscaled : d.unscaled).toString();
  if (d.scale <= 0) s = s === "0" ? "0" : s + "0".repeat(-d.scale);
  else {
    s = s.padStart(d.scale + 1, "0");
    s = `${s.slice(0, s.length - d.scale)}.${s.slice(s.length - d.scale)}`;
  }
  return neg ? `-${s}` : s;
}

/** Exact decimal value of an IEEE-754 double, i.e. what new BigDecimal(double) holds. */
export function exactDouble(x: number): string {
  if (!Number.isFinite(x)) return String(x);
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const bits = view.getBigUint64(0);
  const neg = bits >> 63n === 1n;
  const exp = Number((bits >> 52n) & 0x7ffn);
  let mant = bits & ((1n << 52n) - 1n);
  let e2: number;
  if (exp === 0) e2 = -1074;
  else { mant |= 1n << 52n; e2 = exp - 1075; }
  if (mant === 0n) return neg ? "-0" : "0";
  let d: Dec;
  if (e2 >= 0) d = { unscaled: mant << BigInt(e2), scale: 0 };
  else d = { unscaled: mant * 5n ** BigInt(-e2), scale: -e2 };
  // strip trailing zeros of the fraction
  while (d.scale > 0 && d.unscaled % 10n === 0n) d = { unscaled: d.unscaled / 10n, scale: d.scale - 1 };
  const s = toPlain(d);
  return neg ? `-${s}` : s;
}

/** Double.toString(double) formatting (shortest repr, JDK 19+ algorithm). */
export function javaDoubleToString(x: number): string {
  if (Number.isNaN(x)) return "NaN";
  if (!Number.isFinite(x)) return x > 0 ? "Infinity" : "-Infinity";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const abs = Math.abs(x);
  const [mant, expStr] = abs.toExponential().split("e") as [string, string];
  const exp = Number(expStr);
  const digits = mant.replace(".", "");
  const sign = x < 0 ? "-" : "";
  if (abs >= 1e-3 && abs < 1e7) {
    if (exp >= 0) {
      const intPart = digits.slice(0, exp + 1).padEnd(exp + 1, "0");
      const frac = digits.slice(exp + 1) || "0";
      return `${sign}${intPart}.${frac}`;
    }
    return `${sign}0.${"0".repeat(-exp - 1)}${digits}`;
  }
  return `${sign}${digits[0]}.${digits.slice(1) || "0"}E${exp}`;
}

export function runBigdecimalRounding(input: string, options: BigdecimalRoundingOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const rows: string[][] = [];
  const notes: string[] = [];
  for (const line of lines) {
    const d = parseDecimal(line);
    if (!d) return { output: "", error: { message: `"${line}" is not a decimal number (examples: 2.345, -1.5, 1E+3).` } };
    rows.push([toPlain(d), ...MODES.map((m) => { const r = setScale(d, options.scale, m); return r ? toPlain(r) : "throws"; })]);
    if (options.showDouble) {
      const asDouble = Number(line);
      const exact = exactDouble(asDouble);
      if (exact !== toPlain(d).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")) {
        const viaDouble = parseDecimal(exact)!;
        const hu = setScale(viaDouble, options.scale, "HALF_UP");
        notes.push(`${line}\n  new BigDecimal(${line})          = ${exact}\n  BigDecimal.valueOf(${line})     = ${javaDoubleToString(asDouble)}  (uses Double.toString)\n  new BigDecimal("${line}")        = ${toPlain(d)}\n  HALF_UP of the double at scale ${options.scale}: ${hu ? toPlain(hu) : "?"}${hu && toPlain(hu) !== rows[rows.length - 1]![5] ? "  <- differs from the String constructor" : ""}`);
      }
    }
  }
  const header = ["value", ...MODES];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const fmt = (r: string[]) => r.map((c, i) => c.padStart(widths[i]!)).join("  ");
  const out = [`setScale(${options.scale}, RoundingMode.X)`, fmt(header), widths.map((w) => "-".repeat(w)).join("  "), ...rows.map(fmt)];
  out.push("", "\"throws\" = ArithmeticException: Rounding necessary.");
  if (notes.length) out.push("", "Double pitfalls: these values cannot be represented exactly as a double.", ...notes);
  return { output: out.join("\n"), error: null };
}
