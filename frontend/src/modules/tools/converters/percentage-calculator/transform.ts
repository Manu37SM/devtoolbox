import type { TransformResult } from "@/lib/tool-transform";
import type { PercentageCalculatorOptions } from "./schema";

const NUM = String.raw`(-?\d+(?:\.\d+)?)`;
type Fmt = (n: number) => string;
const RULES: { re: RegExp; run: (a: number, b: number, fmtn: Fmt) => string | null }[] = [
  { re: new RegExp(`^${NUM}\\s*%\\s*of\\s*${NUM}$`, "i"), run: (p, x, fmtn) => fmtn((p / 100) * x) },
  { re: new RegExp(`^${NUM}\\s*(?:is|as)\\s*what\\s*%\\s*of\\s*${NUM}$`, "i"), run: (x, y, fmtn) => (y === 0 ? null : `${fmtn((x / y) * 100)}%`) },
  { re: new RegExp(`^${NUM}\\s*%\\s*off\\s*${NUM}$`, "i"), run: (p, x, fmtn) => fmtn(x * (1 - p / 100)) },
  { re: new RegExp(`^increase\\s*${NUM}\\s*by\\s*${NUM}\\s*%$`, "i"), run: (x, p, fmtn) => fmtn(x * (1 + p / 100)) },
  { re: new RegExp(`^decrease\\s*${NUM}\\s*by\\s*${NUM}\\s*%$`, "i"), run: (x, p, fmtn) => fmtn(x * (1 - p / 100)) },
  // 30 is 20% of what -> 150
  { re: new RegExp(`^${NUM}\\s*is\\s*${NUM}\\s*%\\s*of\\s*what$`, "i"), run: (x, p, fmtn) => (p === 0 ? null : fmtn(x / (p / 100))) },
  // 200 + 18% / 200 - 10%
  { re: new RegExp(`^${NUM}\\s*\\+\\s*${NUM}\\s*%$`), run: (x, p, fmtn) => fmtn(x * (1 + p / 100)) },
  { re: new RegExp(`^${NUM}\\s*-\\s*${NUM}\\s*%$`), run: (x, p, fmtn) => fmtn(x * (1 - p / 100)) },
  // margin and markup for a cost and a selling price
  { re: new RegExp(`^margin\\s*(?:cost\\s*)?${NUM}\\s*(?:price|to)?\\s*${NUM}$`, "i"), run: (c, p, fmtn) => (p === 0 ? null : `${fmtn(((p - c) / p) * 100)}% margin, ${c === 0 ? "∞" : fmtn(((p - c) / c) * 100)}% markup`) },
  { re: new RegExp(`^(?:change\\s*)?from\\s*${NUM}\\s*to\\s*${NUM}$`, "i"), run: (a, b, fmtn) => (a === 0 ? null : `${b >= a ? "+" : ""}${fmtn(((b - a) / Math.abs(a)) * 100)}%`) },
];

export function fmtn(n: number, dp = 6, grouping = false): string {
  const v = Number(n.toFixed(dp));
  return grouping ? v.toLocaleString("en-US", { maximumFractionDigits: dp }) : v.toString();
}

export function calcPercentage(input: string, options: Partial<PercentageCalculatorOptions>): TransformResult {
  const dp = options.decimals ?? 6;
  const fmt: Fmt = (n) => fmtn(n, dp, options.grouping ?? false);
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const text = line.replace(/,/g, "");
    let result: string | null | undefined;
    let matched = false;
    for (const rule of RULES) {
      const m = rule.re.exec(text);
      if (m) { matched = true; result = rule.run(Number(m[1]), Number(m[2]), fmt); break; }
    }
    if (!matched) return { output: "", error: { message: 'Try "20% of 150", "30 is what % of 120", "from 80 to 100", "increase 100 by 15%", "decrease 100 by 15%" or "25% off 80", "30 is 20% of what", "200 + 18%" or "margin 80 price 100".', line: i + 1 } };
    if (result === null) return { output: "", error: { message: "Cannot divide by zero.", line: i + 1 } };
    out.push(options.output === "result" ? result! : `${line}  =  ${result}`);
  }
  return { output: out.join("\n"), error: null };
}
