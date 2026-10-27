import type { TransformResult } from "@/lib/tool-transform";
import type { BitwiseCalculatorOptions } from "./schema";

export function parseInt64(text: string): bigint | null {
  const t = text.trim().replace(/_/g, "");
  if (/^-?0x[0-9a-f]+$/i.test(t) || /^-?0b[01]+$/i.test(t) || /^-?0o[0-7]+$/i.test(t) || /^-?\d+$/.test(t)) {
    const neg = t.startsWith("-");
    const v = BigInt(neg ? t.slice(1) : t);
    return neg ? -v : v;
  }
  return null;
}

const BINARY = /^(.+?)\s*(>>>|<<|>>|&|\||\^)\s*(.+)$/;

export function evalBitwise(line: string, bits: number): bigint {
  const wrap = (v: bigint) => BigInt.asUintN(bits, v);
  const t = line.trim();
  if (t.startsWith("~")) {
    const v = parseInt64(t.slice(1));
    if (v === null) throw new Error(`Invalid operand "${t.slice(1).trim()}"`);
    return wrap(~wrap(v));
  }
  const m = BINARY.exec(t);
  if (!m) {
    const v = parseInt64(t);
    if (v === null) throw new Error('Use "a & b", "a | b", "a ^ b", "a << n", "a >> n", "a >>> n" or "~a"');
    return wrap(v);
  }
  const a = parseInt64(m[1]!);
  const b = parseInt64(m[3]!);
  if (a === null || b === null) throw new Error(`Invalid operand in "${t}"`);
  const ua = wrap(a);
  switch (m[2]) {
    case "&": return wrap(ua & wrap(b));
    case "|": return wrap(ua | wrap(b));
    case "^": return wrap(ua ^ wrap(b));
    case "<<": return wrap(ua << b);
    case ">>>": return wrap(ua >> b);
    default: return wrap(BigInt.asIntN(bits, ua) >> b); // arithmetic shift
  }
}

export function bitwise(input: string, options: BitwiseCalculatorOptions): TransformResult {
  const bits = Number(options.width);
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    try {
      const r = evalBitwise(line, bits);
      const bin = r.toString(2).padStart(bits, "0").replace(/(.{8})(?=.)/g, "$1 ");
      out.push(`${line}\n  unsigned  ${r}\n  signed    ${BigInt.asIntN(bits, r)}\n  hex       0x${r.toString(16).toUpperCase().padStart(bits / 4, "0")}\n  binary    ${bin}`);
    } catch (e) {
      return { output: "", error: { message: e instanceof Error ? e.message : "Invalid expression", line: i + 1 } };
    }
  }
  return { output: out.join("\n\n"), error: null };
}
