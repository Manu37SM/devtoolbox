import type { TransformResult } from "@/lib/tool-transform";
import type { AspectRatioCalculatorOptions } from "./schema";

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const COMMON: [number, number, string][] = [[16, 9, "16:9"], [4, 3, "4:3"], [21, 9, "21:9"], [1, 1, "1:1"], [3, 2, "3:2"], [9, 16, "9:16"], [5, 4, "5:4"], [2, 1, "2:1"], [32, 9, "32:9"]];

export function simplify(w: number, h: number): [number, number] {
  const g = gcd(w, h);
  return [w / g, h / g];
}

export function nearestCommon(w: number, h: number): string | null {
  const r = w / h;
  const hit = COMMON.find(([a, b]) => Math.abs(a / b - r) / r < 0.01);
  return hit ? hit[2] : null;
}

export function calcAspectRatio(input: string, options: AspectRatioCalculatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const m = /^(\d+(?:\.\d+)?)\s*[x×:*,]\s*(\d+(?:\.\d+)?)$/i.exec(line);
    const w = m ? Number(m[1]) : 0;
    const h = m ? Number(m[2]) : 0;
    if (!m || w <= 0 || h <= 0) return { output: "", error: { message: 'Expected "width x height", e.g. 1920x1080.', line: i + 1 } };
    const rows = [line];
    if (Number.isInteger(w) && Number.isInteger(h)) {
      const [a, b] = simplify(w, h);
      rows.push(`  ratio      ${a}:${b}${a > 50 || b > 50 ? `  (≈ ${nearestCommon(w, h) ?? "no common ratio"})` : ""}`);
    } else {
      rows.push(`  ratio      ≈ ${nearestCommon(w, h) ?? "no common ratio"}`);
    }
    rows.push(`  decimal    ${(w / h).toFixed(4)}`);
    if (options.targetWidth > 0) rows.push(`  at width ${options.targetWidth}  → height ${Math.round((options.targetWidth * h) / w)}`);
    if (options.targetHeight > 0) rows.push(`  at height ${options.targetHeight} → width ${Math.round((options.targetHeight * w) / h)}`);
    rows.push(`  padding-top hack  ${((h / w) * 100).toFixed(4).replace(/\.?0+$/, "")}%`);
    out.push(rows.join("\n"));
  }
  return { output: out.join("\n\n"), error: null };
}
