import type { TransformResult } from "@/lib/tool-transform";
import type { ColorContrastCheckerOptions } from "./schema";

export function parseHex(text: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const mark = (ok: boolean) => (ok ? "pass" : "FAIL");

export function checkContrast(input: string, options: ColorContrastCheckerOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const parts = line.split(/\s*(?:,|\bon\b|\s)\s*/i).filter(Boolean);
    const fg = parts[0] ? parseHex(parts[0]) : null;
    const bg = parts[1] ? parseHex(parts[1]) : null;
    if (parts.length !== 2 || !fg || !bg) return { output: "", error: { message: "Expected two hex colors, e.g. #1a1a1a on #ffffff.", line: i + 1 } };
    const r = contrastRatio(fg, bg);
    const shown = (Math.floor(r * 100) / 100).toFixed(2);
    const rows = [`${parts[0]} on ${parts[1]}  →  ${shown}:1`,
      `  AA   normal text (≥4.5)  ${mark(r >= 4.5)}   large text (≥3)  ${mark(r >= 3)}`,
      `  AAA  normal text (≥7)    ${mark(r >= 7)}   large text (≥4.5) ${mark(r >= 4.5)}`];
    if (options.includeUi) rows.push(`  UI components / graphics (≥3)  ${mark(r >= 3)}`);
    out.push(rows.join("\n"));
  }
  return { output: out.join("\n\n"), error: null };
}
