import type { TransformResult } from "@/lib/tool-transform";
import { bytesToHex, parseByteInput } from "@/lib/byte-input";
import type { Asn1DerDecoderOptions } from "./schema";
import { OIDS } from "./oids";

export interface Node {
  offset: number; depth: number; headerLength: number; length: number;
  tagClass: "universal" | "application" | "context" | "private"; constructed: boolean; tagNumber: number;
  children: Node[]; value?: string; encapsulated?: boolean;
}

const UNIVERSAL: Record<number, string> = {
  1: "BOOLEAN", 2: "INTEGER", 3: "BIT STRING", 4: "OCTET STRING", 5: "NULL", 6: "OBJECT IDENTIFIER", 7: "ObjectDescriptor", 8: "EXTERNAL", 9: "REAL",
  10: "ENUMERATED", 12: "UTF8String", 13: "RELATIVE-OID", 16: "SEQUENCE", 17: "SET", 18: "NumericString", 19: "PrintableString", 20: "T61String",
  21: "VideotexString", 22: "IA5String", 23: "UTCTime", 24: "GeneralizedTime", 25: "GraphicString", 26: "VisibleString", 27: "GeneralString", 28: "UniversalString", 30: "BMPString",
};

export const tagName = (n: Node) => (n.tagClass === "universal" ? UNIVERSAL[n.tagNumber] ?? `UNIVERSAL ${n.tagNumber}` : n.tagClass === "context" ? `[${n.tagNumber}]` : `${n.tagClass.toUpperCase()} ${n.tagNumber}`);

export function decodeOid(b: Uint8Array): string {
  const parts: number[] = [];
  let v = 0n;
  for (const byte of b) {
    v = (v << 7n) | BigInt(byte & 0x7f);
    if (!(byte & 0x80)) {
      if (parts.length === 0) { const first = v < 40n ? 0n : v < 80n ? 1n : 2n; parts.push(Number(first), Number(v - first * 40n)); }
      else parts.push(Number(v));
      v = 0n;
    }
  }
  return parts.join(".");
}

function readNode(b: Uint8Array, start: number, end: number, depth: number, opts: { encapsulated: boolean }): Node {
  let p = start;
  if (p >= end) throw new Error(`Unexpected end of data at offset ${p}.`);
  const first = b[p++]!;
  const tagClass = (["universal", "application", "context", "private"] as const)[first >> 6]!;
  const constructed = (first & 0x20) !== 0;
  let tagNumber = first & 0x1f;
  if (tagNumber === 0x1f) {
    tagNumber = 0;
    let byte: number;
    do { if (p >= end) throw new Error(`Truncated tag at offset ${start}.`); byte = b[p++]!; tagNumber = tagNumber * 128 + (byte & 0x7f); } while (byte & 0x80);
  }
  if (p >= end) throw new Error(`Truncated length at offset ${start}.`);
  let lenByte = b[p++]!;
  let length: number;
  let indefinite = false;
  if (lenByte < 0x80) length = lenByte;
  else if (lenByte === 0x80) { if (!constructed) throw new Error(`Indefinite length on a primitive at offset ${start}.`); indefinite = true; length = 0; }
  else {
    const n = lenByte & 0x7f;
    if (n > 4) throw new Error(`Length of ${n} bytes at offset ${start} is not supported.`);
    length = 0;
    for (let i = 0; i < n; i++) { if (p >= end) throw new Error(`Truncated length at offset ${start}.`); lenByte = b[p++]!; length = length * 256 + lenByte; }
  }
  const headerLength = p - start;
  const node: Node = { offset: start, depth, headerLength, length, tagClass, constructed, tagNumber, children: [] };
  if (indefinite) {
    let q = p;
    while (!(b[q] === 0 && b[q + 1] === 0)) {
      if (q >= end) throw new Error(`Missing end-of-contents for indefinite length at offset ${start}.`);
      const child = readNode(b, q, end, depth + 1, opts);
      node.children.push(child);
      q = child.offset + child.headerLength + child.length;
    }
    node.length = q + 2 - p;
    return node;
  }
  if (p + length > end) throw new Error(`Length ${length} at offset ${start} runs past the end of the data (${end - p} bytes left).`);
  const content = b.subarray(p, p + length);
  if (constructed) {
    let q = p;
    while (q < p + length) { const child = readNode(b, q, p + length, depth + 1, opts); node.children.push(child); q = child.offset + child.headerLength + child.length; }
    return node;
  }
  node.value = primitiveValue(node, content);
  if (opts.encapsulated && tagClass === "universal" && (tagNumber === 4 || tagNumber === 3)) {
    const inner = tagNumber === 3 ? content.subarray(1) : content;
    const innerStart = tagNumber === 3 ? p + 1 : p;
    if (tagNumber === 3 && content[0] !== 0) return node;
    if (inner.length >= 2 && (inner[0] === 0x30 || inner[0] === 0x31 || inner[0] === 0x04 || inner[0] === 0x02 || inner[0] === 0x03)) {
      try {
        const kids: Node[] = [];
        let q = innerStart;
        while (q < p + length) { const child = readNode(b, q, p + length, depth + 1, opts); kids.push(child); q = child.offset + child.headerLength + child.length; }
        if (q === p + length) { node.children = kids; node.encapsulated = true; }
      } catch { /* not DER inside */ }
    }
  }
  return node;
}

function printable(b: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(b);
}

function primitiveValue(n: Node, c: Uint8Array): string {
  if (n.tagClass !== "universal") return bytesToHex(c);
  switch (n.tagNumber) {
    case 1: return c[0] ? "TRUE" : "FALSE";
    case 2: case 10: {
      if (c.length === 0) return "0";
      let v = 0n;
      for (const x of c) v = (v << 8n) | BigInt(x);
      if (c[0]! & 0x80) v -= 1n << BigInt(c.length * 8);
      return c.length > 8 ? `0x${bytesToHex(c)} (${c.length * 8} bits)` : v.toString();
    }
    case 3: return `unused bits ${c[0] ?? 0}: ${bytesToHex(c.subarray(1))}`;
    case 4: return bytesToHex(c);
    case 5: return "";
    case 6: { const oid = decodeOid(c); return OIDS[oid] ? `${oid} (${OIDS[oid]})` : oid; }
    case 12: case 18: case 19: case 20: case 22: case 26: case 27: return JSON.stringify(printable(c));
    case 23: { const s = printable(c); const m = /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z$/.exec(s); return m ? `${s} (${Number(m[1]) < 50 ? "20" : "19"}${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6] ?? "00"} UTC)` : s; }
    case 24: return printable(c);
    case 30: { let s = ""; for (let i = 0; i + 1 < c.length; i += 2) s += String.fromCharCode((c[i]! << 8) | c[i + 1]!); return JSON.stringify(s); }
    default: return bytesToHex(c);
  }
}

export function decodeDer(bytes: Uint8Array, encapsulated = true): Node[] {
  const roots: Node[] = [];
  let p = 0;
  while (p < bytes.length) {
    const n = readNode(bytes, p, bytes.length, 0, { encapsulated });
    roots.push(n);
    p = n.offset + n.headerLength + n.length;
  }
  return roots;
}

export function flattenNodes(nodes: Node[]): Node[] {
  return nodes.flatMap((n) => [n, ...flattenNodes(n.children)]);
}

export function runAsn1DerDecoder(input: string, options: Asn1DerDecoderOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let bytes: Uint8Array;
  try { bytes = parseByteInput(input, options.inputMode); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  let roots: Node[];
  try { roots = decodeDer(bytes, options.decodeEncapsulated); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const lines: string[] = [];
  const walk = (n: Node) => {
    const pad = "  ".repeat(n.depth);
    const head = options.showOffsets ? `${String(n.offset).padStart(5)} ${String(n.headerLength).padStart(1)}+${String(n.length).padEnd(5)} ` : "";
    const label = `${tagName(n)}${n.encapsulated ? " (encapsulates)" : ""}`;
    const val = n.value !== undefined && !n.encapsulated ? ` ${n.value.length > 160 ? `${n.value.slice(0, 160)}... (${n.length} bytes)` : n.value}` : n.constructed ? ` (${n.children.length} item${n.children.length === 1 ? "" : "s"})` : "";
    lines.push(`${head}${pad}${label}${val}`);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  if (roots.length > 1) lines.push("", `${roots.length} top-level elements.`);
  const header = options.showOffsets ? "offset hdr+len  structure\n" : "";
  return { output: header + lines.join("\n"), error: null };
}
