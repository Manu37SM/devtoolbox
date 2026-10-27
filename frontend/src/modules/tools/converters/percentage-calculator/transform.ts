import type { TransformResult } from "@/lib/tool-transform";
import type { PercentageCalculatorOptions } from "./schema";

const NUM = String.raw`(-?\d+(?:\.\d+)?)`;
const RULES: { re: RegExp; run: (a: number, b: number) => string | null }[] = [
  { re: new RegExp(`^${NUM}\\s*%\\s*of\\s*${NUM}$`, "i"), run: (p, x) => fmtn((p / 100) * x) },
  { re: new RegExp(`^${NUM}\\s*(?:is|as)\\s*what\\s*%\\s*of\\s*${NUM}$`, "i"), run: (x, y) => (y === 0 ? null : `${fmtn((x / y) * 100)}%`) },
  { re: new RegExp(`^${NUM}\\s*%\\s*off\\s*${NUM}$`, "i"), run: (p, x) => fmtn(x * (1 - p / 100)) },
  { re: new RegExp(`^increase\\s*${NUM}\\s*by\\s*${NUM}\\s*%$`, "i"), run: (x, p) => fmtn(x * (1 + p / 100)) },
  { re: new RegExp(`^decrease\\s*${NUM}\\s*by\\s*${NUM}\\s*%$`, "i"), run: (x, p) => fmtn(x * (1 - p / 100)) },
  { re: new RegExp(`^(?:change\\s*)?from\\s*${NUM}\\s*to\\s*${NUM}$`, "i"), run: (a, b) => (a === 0 ? null : `${b >= a ? "+" : ""}${fmtn(((b - a) / Math.abs(a)) * 100)}%`) },
];

export function fmtn(n: number, dp = 6): string {
  return Number(n.toFixed(dp)).toString();
}

export function calcPercentage(input: string, _options: PercentageCalculatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const text = line.replace(/,/g, "");
    let result: string | null | undefined;
    let matched = false;
    for (const rule of RULES) {
      const m = rule.re.exec(text);
      if (m) { matched = true; result = rule.run(Number(m[1]), Number(m[2])); break; }
    }
    if (!matched) return { output: "", error: { message: 'Try "20% of 150", "30 is what % of 120", "from 80 to 100", "increase 100 by 15%", "decrease 100 by 15%" or "25% off 80".', line: i + 1 } };
    if (result === null) return { output: "", error: { message: "Cannot divide by zero.", line: i + 1 } };
    out.push(`${line}  =  ${result}`);
  }
  return { output: out.join("\n"), error: null };
}
