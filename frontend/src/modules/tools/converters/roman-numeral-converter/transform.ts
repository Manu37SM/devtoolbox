import type { TransformResult } from "@/lib/tool-transform";
import type { RomanNumeralMode } from "./schema";

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

export function numberToRoman(value: number): string {
  let n = value;
  let out = "";
  for (const [v, sym] of NUMERALS) {
    while (n >= v) {
      out += sym;
      n -= v;
    }
  }
  return out;
}

export function romanToNumber(input: string): number {
  const s = input.toUpperCase();
  let total = 0;
  let i = 0;
  while (i < s.length) {
    const cur = ROMAN_VALUES[s[i]!];
    if (cur === undefined) {
      throw new Error(`Invalid Roman numeral character: "${s[i]}"`);
    }
    const next = i + 1 < s.length ? ROMAN_VALUES[s[i + 1]!] : undefined;
    if (next !== undefined && cur < next) {
      total += next - cur;
      i += 2;
    } else {
      total += cur;
      i += 1;
    }
  }
  return total;
}

export function convertRomanNumeral(input: string, mode: RomanNumeralMode): TransformResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { output: "", error: null };

  if (mode === "to-roman") {
    if (!/^-?\d+$/.test(trimmed)) {
      return { output: "", error: { message: `"${input}" is not a valid integer.` } };
    }
    const value = Number(trimmed);
    if (value < 1 || value > 3999) {
      return { output: "", error: { message: "Roman numerals only support integers from 1 to 3999." } };
    }
    return { output: numberToRoman(value), error: null };
  }

  if (!/^[IVXLCDMivxlcdm]+$/.test(trimmed)) {
    return {
      output: "",
      error: { message: `"${input}" contains characters that aren't Roman numerals (I, V, X, L, C, D, M).` },
    };
  }
  try {
    const value = romanToNumber(trimmed);
    if (value < 1 || value > 3999 || numberToRoman(value) !== trimmed.toUpperCase()) {
      return { output: "", error: { message: `"${input}" is not a valid canonical Roman numeral.` } };
    }
    return { output: String(value), error: null };
  } catch (e) {
    return {
      output: "",
      error: { message: e instanceof Error ? e.message : "Could not parse this Roman numeral." },
    };
  }
}
