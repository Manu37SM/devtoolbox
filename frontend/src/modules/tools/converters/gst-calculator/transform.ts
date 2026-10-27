import type { TransformResult } from "@/lib/tool-transform";
import type { GstCalculatorOptions } from "./schema";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const money = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function splitGst(amount: number, ratePct: number, inclusive: boolean): { base: number; gst: number; total: number } {
  if (inclusive) {
    const base = r2(amount / (1 + ratePct / 100));
    return { base, gst: r2(amount - base), total: amount };
  }
  const gst = r2((amount * ratePct) / 100);
  return { base: amount, gst, total: r2(amount + gst) };
}

export function calcGst(input: string, o: GstCalculatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const rate = Number(o.rate);
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const amount = Number(line.replace(/[₹,\s]|rs\.?/gi, ""));
    if (!Number.isFinite(amount) || amount < 0 || line === "") return { output: "", error: { message: "Enter an amount like 1000 or ₹1,499.50.", line: i + 1 } };
    const { base, gst, total } = splitGst(amount, rate, o.mode === "inclusive");
    const taxRows = o.intraState
      ? [`  CGST ${rate / 2}%      ${money(r2(gst / 2))}`, `  SGST ${rate / 2}%      ${money(r2(gst - r2(gst / 2)))}`]
      : [`  IGST ${rate}%      ${money(gst)}`];
    out.push([`${line}  (${o.mode === "inclusive" ? "GST included" : "GST extra"} @ ${rate}%)`, `  Taxable value   ${money(base)}`, ...taxRows, `  Total           ${money(total)}`].join("\n"));
  }
  return { output: out.join("\n\n"), error: null };
}
