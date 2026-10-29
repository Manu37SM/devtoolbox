import type { TransformResult } from "@/lib/tool-transform";
import { bytesToHex, hexToBytes } from "@/lib/byte-input";
import type { PackedDecimalConverterOptions } from "./schema";

export interface Pic { signed: boolean; intDigits: number; decDigits: number; total: number }

/** Parses numeric PIC clauses such as S9(7)V99, 9(5), S999V9(3). */
export function parsePic(text: string): Pic {
  const s = text.trim().toUpperCase().replace(/^PIC(TURE)?\s+(IS\s+)?/, "").replace(/\s+(COMP-3|COMP|PACKED-DECIMAL|BINARY|DISPLAY).*$/, "");
  const m = /^(S)?((?:9(?:\(\d+\))?)+)(?:V((?:9(?:\(\d+\))?)+))?$/.exec(s);
  if (!m) throw new Error(`Unsupported PIC "${text}". Use forms like S9(7)V99, 9(5) or S999V99.`);
  const count = (part: string | undefined) => (part ? [...part.matchAll(/9(?:\((\d+)\))?/g)].reduce((n, x) => n + (x[1] ? Number(x[1]) : 1), 0) : 0);
  const intDigits = count(m[2]), decDigits = count(m[3]);
  const total = intDigits + decDigits;
  if (total === 0 || total > 31) throw new Error(`PIC ${text} has ${total} digits; COBOL numeric items hold 1 to 31 digits.`);
  return { signed: !!m[1], intDigits, decDigits, total };
}

export const packedBytes = (p: Pic) => Math.floor(p.total / 2) + 1;
export const binaryBytes = (p: Pic) => (p.total <= 4 ? 2 : p.total <= 9 ? 4 : p.total <= 18 ? 8 : 0);

/** Parses "123.45" into an unscaled integer at the PIC's scale, rejecting overflow and extra decimals. */
export function toUnscaled(value: string, p: Pic): bigint {
  const m = /^\s*([+-])?(\d*)(?:\.(\d*))?\s*$/.exec(value);
  if (!m || (m[2] === "" && !m[3])) throw new Error(`"${value}" is not a number.`);
  const frac = m[3] ?? "";
  if (frac.replace(/0+$/, "").length > p.decDigits) throw new Error(`"${value}" has more than ${p.decDigits} decimal place${p.decDigits === 1 ? "" : "s"}; round it first.`);
  const digits = `${m[2] || "0"}${frac.padEnd(p.decDigits, "0").slice(0, p.decDigits)}`.replace(/^0+(?=\d)/, "");
  if (digits.length > p.total) throw new Error(`"${value}" needs ${digits.length} digits but the PIC holds ${p.total}.`);
  const neg = m[1] === "-" && /[1-9]/.test(digits);
  if (neg && !p.signed) throw new Error(`"${value}" is negative but the PIC has no S.`);
  return neg ? -BigInt(digits) : BigInt(digits);
}

export function formatScaled(u: bigint, p: Pic): string {
  const neg = u < 0n;
  const s = (neg ? -u : u).toString().padStart(p.decDigits + 1, "0");
  const body = p.decDigits ? `${s.slice(0, -p.decDigits)}.${s.slice(-p.decDigits)}` : s;
  return neg ? `-${body}` : body;
}

export function encode(u: bigint, p: Pic, format: PackedDecimalConverterOptions["format"]): Uint8Array {
  const neg = u < 0n;
  const digits = (neg ? -u : u).toString();
  if (format === "comp-3") {
    const n = packedBytes(p);
    const nibbles = digits.padStart(n * 2 - 1, "0") + (p.signed ? (neg ? "D" : "C") : "F");
    return hexToBytes(nibbles);
  }
  if (format === "zoned") {
    const d = digits.padStart(p.total, "0");
    const out = [...d].map((c) => 0xf0 | Number(c));
    if (p.signed) out[out.length - 1] = (neg ? 0xd0 : 0xc0) | Number(d[d.length - 1]);
    return Uint8Array.from(out);
  }
  const n = binaryBytes(p);
  if (!n) throw new Error("COMP (binary) items hold at most 18 digits.");
  let v = BigInt.asUintN(n * 8, u);
  const out = new Uint8Array(n);
  for (let i = n - 1; i >= 0; i--) { out[i] = Number(v & 0xffn); v >>= 8n; }
  return out;
}

export function decode(bytes: Uint8Array, p: Pic, format: PackedDecimalConverterOptions["format"]): { value: bigint; note?: string } {
  if (format === "comp-3") {
    const hex = bytesToHex(bytes);
    if (bytes.length !== packedBytes(p)) throw new Error(`${p.total} digits pack into ${packedBytes(p)} bytes, got ${bytes.length}.`);
    const sign = hex[hex.length - 1]!;
    const digits = hex.slice(0, -1);
    if (!/^\d+$/.test(digits)) throw new Error(`Packed digits contain a non-decimal nibble: ${hex}.`);
    if (!/[A-F]/.test(sign)) throw new Error(`Last nibble "${sign}" is not a sign (C, D or F).`);
    const neg = sign === "B" || sign === "D";
    const v = BigInt(digits);
    return { value: neg ? -v : v, note: sign === "F" && p.signed ? "unsigned sign nibble F on a signed PIC" : !p.signed && sign !== "F" ? `sign nibble ${sign} on an unsigned PIC` : undefined };
  }
  if (format === "zoned") {
    if (bytes.length !== p.total) throw new Error(`Zoned decimal uses one byte per digit: expected ${p.total}, got ${bytes.length}.`);
    let digits = "";
    let neg = false;
    bytes.forEach((b, i) => {
      const zone = b >> 4, d = b & 15;
      if (d > 9) throw new Error(`Byte ${i + 1} (${b.toString(16).toUpperCase()}) is not a zoned digit.`);
      if (i < bytes.length - 1 && zone !== 0xf) throw new Error(`Byte ${i + 1} (${b.toString(16).toUpperCase()}) should have zone F.`);
      if (i === bytes.length - 1) neg = zone === 0xd || zone === 0xb;
      digits += d;
    });
    const v = BigInt(digits);
    return { value: neg ? -v : v };
  }
  const n = binaryBytes(p);
  if (bytes.length !== n) throw new Error(`COMP with ${p.total} digits is ${n} bytes, got ${bytes.length}.`);
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  if (p.signed) v = BigInt.asIntN(n * 8, v);
  const limit = 10n ** BigInt(p.total);
  return { value: v, note: v >= limit || v <= -limit ? `value exceeds ${p.total} digits (only possible with TRUNC(BIN))` : undefined };
}

export function runPackedDecimalConverter(input: string, options: PackedDecimalConverterOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { output: "", error: null };
  let p: Pic;
  try { p = parsePic(options.pic); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const size = options.format === "comp-3" ? packedBytes(p) : options.format === "zoned" ? p.total : binaryBytes(p);
  const out: string[] = [`PIC ${options.pic.trim().toUpperCase()} ${options.format.toUpperCase()}: ${p.total} digit${p.total === 1 ? "" : "s"} (${p.decDigits} after the implied decimal point), ${size} byte${size === 1 ? "" : "s"}${p.signed ? ", signed" : ", unsigned"}`, ""];
  for (const line of lines) {
    try {
      if (options.direction === "encode") out.push(`${line.padEnd(16)} -> ${bytesToHex(encode(toUnscaled(line, p), p, options.format), " ")}`);
      else { const r = decode(hexToBytes(line), p, options.format); out.push(`${line.padEnd(16)} -> ${formatScaled(r.value, p)}${r.note ? `  (${r.note})` : ""}`); }
    } catch (e) {
      out.push(`${line.padEnd(16)} -> error: ${(e as Error).message}`);
    }
  }
  return { output: out.join("\n"), error: null };
}
