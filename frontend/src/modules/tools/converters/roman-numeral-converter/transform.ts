import type { TransformResult } from "@/lib/tool-transform";
import type { RomanNumeralMode, RomanNumeralOptions } from "./schema";

const NUMERALS: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

const ROMAN_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
const OVERLINE = "̅";
const UNICODE: Record<string, string> = { I: "Ⅰ", V: "Ⅴ", X: "Ⅹ", L: "Ⅼ", C: "Ⅽ", D: "Ⅾ", M: "Ⅿ" };
const UNICODE_SINGLE = ["", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ", "Ⅺ", "Ⅻ"];
const FROM_UNICODE: Record<string, string> = {
  ...Object.fromEntries(Object.entries(UNICODE).map(([a, u]) => [u, a])),
  ...Object.fromEntries(Object.entries(UNICODE).map(([a, u]) => [String.fromCodePoint(u.codePointAt(0)! + 16), a])),
  ...Object.fromEntries(UNICODE_SINGLE.slice(1).map((u, i) => [u, numberToRoman(i + 1)])),
  ...Object.fromEntries(UNICODE_SINGLE.slice(1).map((u, i) => [String.fromCodePoint(u.codePointAt(0)! + 16), numberToRoman(i + 1)])),
  ↀ: "M",
};

export function numberToRoman(value: number, clockFour = false): string {
  let n = value;
  let out = "";
  for (const [v, sym] of NUMERALS) {
    while (n >= v) {
      out += sym;
      n -= v;
    }
  }
  return clockFour ? out.replace(/IV$/, "IIII") : out;
}

function toRomanWithOptions(value: number, o: Partial<RomanNumeralOptions>): string {
  let out: string;
  if (value >= 4000) {
    // Thousands as overlined numerals, remainder as usual: 4,321 = I̅V̅CCCXXI.
    const thousands = numberToRoman(Math.floor(value / 1000));
    out = [...thousands].map((c) => c + OVERLINE).join("") + numberToRoman(value % 1000, o.clockFour);
  } else {
    out = numberToRoman(value, o.clockFour);
  }
  if (o.style === "unicode") {
    out =
      value <= 12 && !o.clockFour
        ? UNICODE_SINGLE[value]!
        : out.replace(/[IVXLCDM]/g, (c) => UNICODE[c]!);
  }
  return o.lowercase ? out.toLowerCase() : out;
}

export function romanToNumber(input: string): number {
  // Overlined characters (vinculum) count × 1000.
  const s = normalize(input);
  let total = 0;
  let i = 0;
  const valueAt = (k: number) => {
    const ch = s[k]!;
    const base = ROMAN_VALUES[ch];
    if (base === undefined) throw new Error(`Invalid Roman numeral character: "${ch}"`);
    return s[k + 1] === OVERLINE ? base * 1000 : base;
  };
  const step = (k: number) => (s[k + 1] === OVERLINE ? 2 : 1);
  while (i < s.length) {
    const cur = valueAt(i);
    const j = i + step(i);
    const next = j < s.length ? valueAt(j) : undefined;
    if (next !== undefined && cur < next) {
      total += next - cur;
      i = j + step(j);
    } else {
      total += cur;
      i = j;
    }
  }
  return total;
}

function normalize(input: string): string {
  return [...input.trim()]
    .map((c) => FROM_UNICODE[c] ?? c)
    .join("")
    .replace(/[̄‾]/g, OVERLINE)
    .toUpperCase();
}

function convertOne(trimmed: string, mode: RomanNumeralMode, o: Partial<RomanNumeralOptions>): { out: string } | { err: string } {
  const max = o.vinculum ? 3_999_999 : 3999;
  if (mode === "to-roman") {
    const clean = trimmed.replace(/[,_\s]/g, "");
    if (!/^-?\d+$/.test(clean)) return { err: `"${trimmed}" is not a valid integer.` };
    const value = Number(clean);
    if (value < 1 || value > max) {
      return {
        err: o.vinculum
          ? "Roman numerals with a vinculum support integers from 1 to 3,999,999."
          : "Roman numerals only support integers from 1 to 3999. Turn on the vinculum option for larger numbers.",
      };
    }
    return { out: toRomanWithOptions(value, o) };
  }

  const s = normalize(trimmed);
  if (!/^([IVXLCDM]̅?)+$/.test(s)) {
    return { err: `"${trimmed}" contains characters that aren't Roman numerals (I, V, X, L, C, D, M).` };
  }
  try {
    const value = romanToNumber(s);
    if (value < 1 || value > max) return { err: `"${trimmed}" is out of range (1–${max.toLocaleString("en-US")}).` };
    if (o.strict ?? true) {
      const canonical = normalize(toRomanWithOptions(value, { vinculum: o.vinculum }));
      const clock = normalize(toRomanWithOptions(value, { vinculum: o.vinculum, clockFour: true }));
      if (s !== canonical && !(o.clockFour && s === clock)) {
        return { err: `"${trimmed}" is not a valid canonical Roman numeral (expected ${canonical}).` };
      }
    }
    return { out: String(value) };
  } catch (e) {
    return { err: e instanceof Error ? e.message : "Could not parse this Roman numeral." };
  }
}

export function convertRomanNumeral(input: string, mode: RomanNumeralMode, options: Partial<RomanNumeralOptions> = {}): TransformResult {
  const lines = input.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim());
  if (nonEmpty.length === 0) return { output: "", error: null };

  if (nonEmpty.length === 1) {
    const r = convertOne(nonEmpty[0]!.trim(), mode, options);
    return "err" in r ? { output: "", error: { message: r.err } } : { output: r.out, error: null };
  }
  // Several lines: convert each, reporting the first failure with its line number.
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]!.trim();
    if (!t) {
      out.push("");
      continue;
    }
    const r = convertOne(t, mode, options);
    if ("err" in r) return { output: "", error: { message: `Line ${i + 1}: ${r.err}` } };
    out.push(r.out);
  }
  return { output: out.join("\n"), error: null };
}
