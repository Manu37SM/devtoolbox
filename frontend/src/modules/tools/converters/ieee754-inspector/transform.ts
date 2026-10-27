import type { TransformResult } from "@/lib/tool-transform";
import type { Ieee754InspectorOptions } from "./schema";

function parseValue(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (t === "nan") return NaN;
  if (t === "inf" || t === "+inf" || t === "infinity" || t === "+infinity") return Infinity;
  if (t === "-inf" || t === "-infinity") return -Infinity;
  if (t === "-0") return -0;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/.test(t)) return null;
  return Number(t);
}

export function floatBits(value: number, width: 32 | 64): { sign: string; exponent: string; mantissa: string; hex: string } {
  const bytes = width === 32 ? 4 : 8;
  const view = new DataView(new ArrayBuffer(bytes));
  if (width === 32) view.setFloat32(0, value);
  else view.setFloat64(0, value);
  let bin = "";
  let hex = "";
  for (let i = 0; i < bytes; i++) {
    bin += view.getUint8(i).toString(2).padStart(8, "0");
    hex += view.getUint8(i).toString(16).padStart(2, "0");
  }
  const expBits = width === 32 ? 8 : 11;
  return { sign: bin.slice(0, 1), exponent: bin.slice(1, 1 + expBits), mantissa: bin.slice(1 + expBits), hex: hex.toUpperCase() };
}

export function classify(exponent: string, mantissa: string): string {
  const allOnes = !exponent.includes("0");
  const allZero = !exponent.includes("1");
  const mantZero = !mantissa.includes("1");
  if (allOnes) return mantZero ? "infinity" : "NaN";
  if (allZero) return mantZero ? "zero" : "subnormal";
  return "normal";
}

export function fromHex(hex: string): { value: number; width: 32 | 64 } | null {
  const h = hex.trim().replace(/^0x/i, "").replace(/[\s_]/g, "");
  if (!/^[0-9a-f]+$/i.test(h) || (h.length !== 8 && h.length !== 16)) return null;
  const view = new DataView(new ArrayBuffer(h.length / 2));
  for (let i = 0; i < h.length; i += 2) view.setUint8(i / 2, parseInt(h.slice(i, i + 2), 16));
  return h.length === 8 ? { value: view.getFloat32(0), width: 32 } : { value: view.getFloat64(0), width: 64 };
}

function describeOne(value: number, width: 32 | 64): string {
  const { sign, exponent, mantissa, hex } = floatBits(value, width);
  const kind = classify(exponent, mantissa);
  const bias = width === 32 ? 127 : 1023;
  const e = parseInt(exponent, 2);
  const stored = width === 32 ? Math.fround(value) : value;
  const rows = [
    `binary${width}`,
    `  hex       0x${hex}`,
    `  sign      ${sign} (${sign === "1" ? "negative" : "positive"})`,
    `  exponent  ${exponent} (${e}${kind === "normal" ? `, unbiased ${e - bias}` : kind === "subnormal" ? `, subnormal → ${1 - bias}` : ""})`,
    `  mantissa  ${mantissa}`,
    `  type      ${kind}`,
  ];
  if (Number.isFinite(stored)) rows.push(`  stored    ${width === 32 ? stored.toPrecision(9) : stored.toPrecision(17)}${stored !== value && width === 32 && Number.isFinite(value) ? `  (rounded from ${value})` : ""}`);
  return rows.join("\n");
}

export function inspectIeee754(input: string, options: Ieee754InspectorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const widths: (32 | 64)[] = options.width === "both" ? [32, 64] : [options.width === "32" ? 32 : 64];
    if (/^0x/i.test(line)) {
      const parsed = fromHex(line);
      if (!parsed) return { output: "", error: { message: "Hex input must be 8 digits (float32) or 16 digits (float64).", line: i + 1 } };
      out.push(`${line}  =  ${parsed.value}  (as float${parsed.width})\n${describeOne(parsed.value, parsed.width)}`);
      continue;
    }
    const v = parseValue(line);
    if (v === null) return { output: "", error: { message: 'Enter a number, "NaN", "Infinity", or hex like 0x3FF0000000000000.', line: i + 1 } };
    out.push(`${line}\n${widths.map((w) => describeOne(v, w)).join("\n")}`);
  }
  return { output: out.join("\n\n"), error: null };
}
