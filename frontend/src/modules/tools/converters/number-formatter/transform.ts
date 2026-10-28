import type { TransformResult } from "@/lib/tool-transform";
import { NUMBER_LOCALES, type NumberFormatterOptions } from "./schema";

export function parseNumberToken(t: string): number | null {
  const s = t.trim().replace(/_/g, "");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fmt(n: number, locale: string, o: NumberFormatterOptions): string {
  return new Intl.NumberFormat(locale, {
    style: o.style,
    ...(o.style === "currency" ? { currency: o.currency } : {}),
    notation: o.notation,
    ...(o.notation === "compact" ? { compactDisplay: o.compactDisplay } : {}),
    minimumFractionDigits: o.minFraction,
    maximumFractionDigits: o.maxFraction,
    useGrouping: o.grouping,
  }).format(n);
}

/** One plain number per line (digits, optional sign, decimal point, exponent). */
export function runNumberFormatter(input: string, o: NumberFormatterOptions): TransformResult {
  const lines = input.split(/\r?\n/);
  if (!input.trim()) return { output: "", error: null };
  if (o.minFraction > o.maxFraction) return { output: "", error: { message: "Minimum fraction digits cannot exceed maximum" } };
  const out: string[] = [];
  for (const [i, l] of lines.entries()) {
    if (!l.trim()) { out.push(""); continue; }
    const n = parseNumberToken(l);
    if (n === null) return { output: "", error: { message: `"${l.trim()}" is not a plain number. Use digits and an optional decimal point, with no thousands separators`, line: i + 1 } };
    if (o.compareLocales) {
      const w = Math.max(...NUMBER_LOCALES.map((x) => x.length));
      out.push(`${l.trim()}\n${NUMBER_LOCALES.map((loc) => `  ${loc.padEnd(w)}  ${fmt(n, loc, o)}`).join("\n")}`);
    } else out.push(fmt(n, o.locale, o));
  }
  return { output: out.join("\n"), error: null };
}
