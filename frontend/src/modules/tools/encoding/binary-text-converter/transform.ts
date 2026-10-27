import type { TransformResult } from "@/lib/tool-transform";
import type { BinaryTextConverterOptions } from "./schema";

const PAD: Record<string, number> = { "2": 8, "8": 3, "10": 0 };

export function convertBinaryText(input: string, options: BinaryTextConverterOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };
  const base = Number(options.base);
  if (options.mode === "encode") {
    const bytes = new TextEncoder().encode(input);
    const out = Array.from(bytes, (b) => b.toString(base).padStart(PAD[options.base] ?? 0, "0"));
    return { output: out.join(" "), error: null };
  }
  const tokens = input.trim().split(/[\s,]+/).filter(Boolean);
  const maxDigits = base === 2 ? 8 : base === 8 ? 3 : 3;
  const bytes: number[] = [];
  for (const [i, tok] of tokens.entries()) {
    const valid = base === 2 ? /^[01]+$/ : base === 8 ? /^[0-7]+$/ : /^\d+$/;
    if (!valid.test(tok) || tok.length > maxDigits) return { output: "", error: { message: `"${tok}" is not a valid base-${base} byte (token ${i + 1}).` } };
    const v = parseInt(tok, base);
    if (v > 255) return { output: "", error: { message: `"${tok}" is larger than one byte (255).` } };
    bytes.push(v);
  }
  try {
    return { output: new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes)), error: null };
  } catch {
    return { output: "", error: { message: "These bytes are not valid UTF-8 text." } };
  }
}
