import type { TransformResult } from "@/lib/tool-transform";
import { bytesToHex, parseByteInput } from "@/lib/byte-input";
import type { ProtobufBinaryDecoderOptions } from "./schema";

export type PbValue =
  | { kind: "varint"; value: bigint }
  | { kind: "i64"; bytes: Uint8Array }
  | { kind: "i32"; bytes: Uint8Array }
  | { kind: "len"; bytes: Uint8Array; message?: PbField[]; text?: string; packed?: bigint[] }
  | { kind: "group"; fields: PbField[] };
export interface PbField { field: number; offset: number; value: PbValue }

class R {
  constructor(public b: Uint8Array, public p = 0, public end = b.length) {}
  varint(): bigint {
    let v = 0n, shift = 0n;
    for (let i = 0; i < 10; i++) {
      if (this.p >= this.end) throw new Error(`Truncated varint at offset ${this.p}`);
      const byte = this.b[this.p++]!;
      v |= BigInt(byte & 0x7f) << shift;
      if (!(byte & 0x80)) return v;
      shift += 7n;
    }
    throw new Error(`Varint longer than 10 bytes at offset ${this.p}`);
  }
  take(n: number): Uint8Array {
    if (n < 0 || this.p + n > this.end) throw new Error(`Length ${n} at offset ${this.p} runs past the end`);
    const out = this.b.subarray(this.p, this.p + n);
    this.p += n;
    return out;
  }
}

const printableRatio = (s: string) => { let ok = 0; for (const ch of s) if (/[\p{L}\p{N}\p{P}\p{S}\p{Zs}\n\r\t]/u.test(ch)) ok++; return s.length ? ok / [...s].length : 0; };

export function decodeMessage(b: Uint8Array, depth = 0, endGroup?: number, r = new R(b)): PbField[] {
  const out: PbField[] = [];
  while (r.p < r.end) {
    const offset = r.p;
    const key = r.varint();
    const field = Number(key >> 3n);
    const wt = Number(key & 7n);
    if (field < 1 || field > 536870911) throw new Error(`Invalid field number ${field} at offset ${offset}`);
    switch (wt) {
      case 0: out.push({ field, offset, value: { kind: "varint", value: r.varint() } }); break;
      case 1: out.push({ field, offset, value: { kind: "i64", bytes: r.take(8) } }); break;
      case 5: out.push({ field, offset, value: { kind: "i32", bytes: r.take(4) } }); break;
      case 2: {
        const len = Number(r.varint());
        const bytes = r.take(len);
        const v: PbValue = { kind: "len", bytes };
        if (depth < 16 && len > 0) {
          try { const m = decodeMessage(bytes, depth + 1); if (m.length) v.message = m; } catch { /* not a message */ }
        }
        const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        if (!text.includes("�") && printableRatio(text) >= 0.9) v.text = text;
        if (!v.message || v.text === undefined) {
          try { const pr = new R(bytes); const vals: bigint[] = []; while (pr.p < pr.end) vals.push(pr.varint()); if (vals.length > 1) v.packed = vals; } catch { /* not packed varints */ }
        }
        out.push({ field, offset, value: v });
        break;
      }
      case 3: { const fields = decodeMessage(b, depth + 1, field, r); out.push({ field, offset, value: { kind: "group", fields } }); break; }
      case 4:
        if (endGroup === field) return out;
        throw new Error(`Unexpected end-group for field ${field} at offset ${offset}`);
      default: throw new Error(`Invalid wire type ${wt} at offset ${offset}`);
    }
  }
  if (endGroup !== undefined) throw new Error(`Missing end-group for field ${endGroup}`);
  return out;
}

const zigzag = (v: bigint) => (v & 1n ? -((v + 1n) >> 1n) : v >> 1n);
const toSigned64 = (v: bigint) => (v >= 1n << 63n ? v - (1n << 64n) : v);
const le = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);

function render(fields: PbField[], depth: number, alt: boolean, lines: string[]) {
  const pad = "  ".repeat(depth);
  for (const f of fields) {
    const v = f.value;
    if (v.kind === "varint") {
      const signed = toSigned64(v.value);
      const extras = alt ? [signed !== v.value ? `int64 ${signed}` : "", `sint ${zigzag(v.value)}`, v.value <= 1n ? `bool ${v.value === 1n}` : ""].filter(Boolean) : [];
      lines.push(`${pad}${f.field}: ${v.value}${extras.length ? `  (${extras.join(", ")})` : ""}`);
    } else if (v.kind === "i64") {
      const d = le(v.bytes);
      lines.push(`${pad}${f.field}: fixed64 ${d.getBigUint64(0, true)}${alt ? `  (sfixed64 ${d.getBigInt64(0, true)}, double ${d.getFloat64(0, true)})` : ""}`);
    } else if (v.kind === "i32") {
      const d = le(v.bytes);
      lines.push(`${pad}${f.field}: fixed32 ${d.getUint32(0, true)}${alt ? `  (sfixed32 ${d.getInt32(0, true)}, float ${+d.getFloat32(0, true).toPrecision(7)})` : ""}`);
    } else if (v.kind === "group") {
      lines.push(`${pad}${f.field}: group {`);
      render(v.fields, depth + 1, alt, lines);
      lines.push(`${pad}}`);
    } else if (v.message && v.text === undefined) {
      lines.push(`${pad}${f.field}: {`);
      render(v.message, depth + 1, alt, lines);
      lines.push(`${pad}}`);
    } else if (v.text !== undefined) {
      lines.push(`${pad}${f.field}: ${JSON.stringify(v.text)}${alt && v.message ? "  (also parses as a message)" : ""}`);
    } else {
      lines.push(`${pad}${f.field}: bytes[${v.bytes.length}] ${bytesToHex(v.bytes, " ")}${alt && v.packed ? `  (packed varints: ${v.packed.join(", ")})` : ""}`);
    }
  }
}

export function runProtobufBinaryDecoder(input: string, options: ProtobufBinaryDecoderOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let bytes: Uint8Array;
  try { bytes = parseByteInput(input, options.inputMode); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const notes: string[] = [];
  if (options.grpcFrame) {
    if (bytes.length < 5) return { output: "", error: { message: "gRPC frames start with a 5-byte header (flag + 4-byte length)." } };
    const len = new DataView(bytes.buffer, bytes.byteOffset).getUint32(1, false);
    if (bytes[0] === 1) notes.push("Frame is flagged as compressed; decompress it first.");
    if (len !== bytes.length - 5) notes.push(`Frame says ${len} bytes but ${bytes.length - 5} follow.`);
    bytes = bytes.subarray(5, 5 + Math.min(len, bytes.length - 5));
  }
  let fields: PbField[];
  try { fields = decodeMessage(bytes); } catch (e) { return { output: "", error: { message: `Not valid protobuf: ${(e as Error).message}` } }; }
  const lines: string[] = [];
  render(fields, 0, options.showAlternatives, lines);
  return { output: [...notes, ...lines, "", `${bytes.length} bytes. Field names and exact types need the .proto; ambiguous byte fields show every plausible reading.`].join("\n"), error: null };
}
