import type { TransformResult } from "@/lib/tool-transform";
import { bytesToBase64, bytesToHex, parseByteInput } from "@/lib/byte-input";
import type { MsgpackCborJsonOptions } from "./schema";

type J = null | boolean | number | bigint | string | J[] | { [k: string]: J };

class Reader {
  p = 0;
  dv: DataView;
  constructor(public b: Uint8Array) { this.dv = new DataView(b.buffer, b.byteOffset, b.byteLength); }
  need(n: number) { if (this.p + n > this.b.length) throw new Error(`Unexpected end of data at offset ${this.p} (need ${n} more bytes)`); }
  u8() { this.need(1); return this.b[this.p++]!; }
  u16() { this.need(2); const v = this.dv.getUint16(this.p); this.p += 2; return v; }
  u32() { this.need(4); const v = this.dv.getUint32(this.p); this.p += 4; return v; }
  u64() { this.need(8); const v = this.dv.getBigUint64(this.p); this.p += 8; return v; }
  i64() { this.need(8); const v = this.dv.getBigInt64(this.p); this.p += 8; return v; }
  f32() { this.need(4); const v = this.dv.getFloat32(this.p); this.p += 4; return v; }
  f64() { this.need(8); const v = this.dv.getFloat64(this.p); this.p += 8; return v; }
  bytes(n: number) { this.need(n); const v = this.b.slice(this.p, this.p + n); this.p += n; return v; }
  str(n: number) { return new TextDecoder("utf-8", { fatal: true }).decode(this.bytes(n)); }
}

const big = (v: bigint): number | bigint => (v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v);
const keyOf = (k: J): string => (typeof k === "string" ? k : JSON.stringify(k, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

// ---------- MessagePack ----------
export function decodeMsgpack(r: Reader, depth = 0): J {
  if (depth > 512) throw new Error("Nesting too deep");
  const t = r.u8();
  if (t <= 0x7f) return t;
  if (t >= 0xe0) return t - 0x100;
  if ((t & 0xf0) === 0x80) return msgMap(r, t & 0x0f, depth);
  if ((t & 0xf0) === 0x90) return msgArr(r, t & 0x0f, depth);
  if ((t & 0xe0) === 0xa0) return r.str(t & 0x1f);
  switch (t) {
    case 0xc0: return null;
    case 0xc2: return false;
    case 0xc3: return true;
    case 0xc4: return { $base64: bytesToBase64(r.bytes(r.u8())) };
    case 0xc5: return { $base64: bytesToBase64(r.bytes(r.u16())) };
    case 0xc6: return { $base64: bytesToBase64(r.bytes(r.u32())) };
    case 0xc7: return ext(r, r.u8());
    case 0xc8: return ext(r, r.u16());
    case 0xc9: return ext(r, r.u32());
    case 0xca: return r.f32();
    case 0xcb: return r.f64();
    case 0xcc: return r.u8();
    case 0xcd: return r.u16();
    case 0xce: return r.u32();
    case 0xcf: return big(r.u64());
    case 0xd0: { const v = r.u8(); return v > 127 ? v - 256 : v; }
    case 0xd1: { const v = r.u16(); return v > 32767 ? v - 65536 : v; }
    case 0xd2: { const v = r.u32(); return v | 0; }
    case 0xd3: return big(r.i64());
    case 0xd4: return ext(r, 1);
    case 0xd5: return ext(r, 2);
    case 0xd6: return ext(r, 4);
    case 0xd7: return ext(r, 8);
    case 0xd8: return ext(r, 16);
    case 0xd9: return r.str(r.u8());
    case 0xda: return r.str(r.u16());
    case 0xdb: return r.str(r.u32());
    case 0xdc: return msgArr(r, r.u16(), depth);
    case 0xdd: return msgArr(r, r.u32(), depth);
    case 0xde: return msgMap(r, r.u16(), depth);
    case 0xdf: return msgMap(r, r.u32(), depth);
  }
  throw new Error(`Invalid MessagePack type byte 0x${t.toString(16)} at offset ${r.p - 1}`);
}
function msgArr(r: Reader, n: number, d: number): J[] { const a: J[] = []; for (let i = 0; i < n; i++) a.push(decodeMsgpack(r, d + 1)); return a; }
function msgMap(r: Reader, n: number, d: number): J { const o: Record<string, J> = {}; for (let i = 0; i < n; i++) { const k = decodeMsgpack(r, d + 1); o[keyOf(k)] = decodeMsgpack(r, d + 1); } return o; }
function ext(r: Reader, n: number): J {
  const type = r.u8();
  const t = type > 127 ? type - 256 : type;
  const data = r.bytes(n);
  if (t === -1) {
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let sec: bigint, ns = 0;
    if (n === 4) sec = BigInt(dv.getUint32(0));
    else if (n === 8) { const hi = dv.getUint32(0), lo = dv.getUint32(4); ns = hi >>> 2; sec = (BigInt(hi & 3) << 32n) | BigInt(lo); }
    else if (n === 12) { ns = dv.getUint32(0); sec = dv.getBigInt64(4); }
    else return { $ext: t, $base64: bytesToBase64(data) };
    const ms = Number(sec) * 1000 + Math.floor(ns / 1e6);
    return { $timestamp: new Date(ms).toISOString().replace(/\.\d{3}Z$/, ns ? `.${String(ns).padStart(9, "0")}Z` : "Z") };
  }
  return { $ext: t, $base64: bytesToBase64(data) };
}

class Writer {
  parts: number[] = [];
  u8(...v: number[]) { this.parts.push(...v); }
  be(v: number | bigint, bytes: number) { let x = BigInt.asUintN(bytes * 8, BigInt(v)); const out: number[] = []; for (let i = 0; i < bytes; i++) { out.unshift(Number(x & 0xffn)); x >>= 8n; } this.parts.push(...out); }
  f64(v: number) { const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, v); this.parts.push(...new Uint8Array(dv.buffer)); }
  utf8(s: string) { const b = new TextEncoder().encode(s); return b; }
  raw(b: Uint8Array) { for (const x of b) this.parts.push(x); }
  done() { return Uint8Array.from(this.parts); }
}

const isInt = (v: unknown): v is number | bigint => typeof v === "bigint" || (typeof v === "number" && Number.isInteger(v) && !Object.is(v, -0));
const isSpecial = (v: Record<string, J>, key: string) => Object.keys(v).length === 1 && typeof v[key] === "string";

export function encodeMsgpack(v: J, w = new Writer()): Writer {
  if (v === null) w.u8(0xc0);
  else if (v === true) w.u8(0xc3);
  else if (v === false) w.u8(0xc2);
  else if (isInt(v)) {
    const n = BigInt(v);
    if (n >= 0n) {
      if (n <= 0x7fn) w.u8(Number(n));
      else if (n <= 0xffn) { w.u8(0xcc); w.be(n, 1); }
      else if (n <= 0xffffn) { w.u8(0xcd); w.be(n, 2); }
      else if (n <= 0xffffffffn) { w.u8(0xce); w.be(n, 4); }
      else if (n <= 0xffffffffffffffffn) { w.u8(0xcf); w.be(n, 8); }
      else throw new Error(`${n} does not fit in 64 bits`);
    } else {
      if (n >= -32n) w.u8(Number(n) & 0xff);
      else if (n >= -128n) { w.u8(0xd0); w.be(n, 1); }
      else if (n >= -32768n) { w.u8(0xd1); w.be(n, 2); }
      else if (n >= -2147483648n) { w.u8(0xd2); w.be(n, 4); }
      else if (n >= -(1n << 63n)) { w.u8(0xd3); w.be(n, 8); }
      else throw new Error(`${n} does not fit in 64 bits`);
    }
  } else if (typeof v === "number") { w.u8(0xcb); w.f64(v); }
  else if (typeof v === "string") {
    const b = w.utf8(v);
    if (b.length <= 31) w.u8(0xa0 | b.length);
    else if (b.length <= 0xff) { w.u8(0xd9); w.be(b.length, 1); }
    else if (b.length <= 0xffff) { w.u8(0xda); w.be(b.length, 2); }
    else { w.u8(0xdb); w.be(b.length, 4); }
    w.raw(b);
  } else if (Array.isArray(v)) {
    if (v.length <= 15) w.u8(0x90 | v.length); else if (v.length <= 0xffff) { w.u8(0xdc); w.be(v.length, 2); } else { w.u8(0xdd); w.be(v.length, 4); }
    for (const x of v) encodeMsgpack(x, w);
  } else if (isSpecial(v, "$base64")) {
    const b = parseByteInput(v.$base64 as string, "base64");
    if (b.length <= 0xff) { w.u8(0xc4); w.be(b.length, 1); } else if (b.length <= 0xffff) { w.u8(0xc5); w.be(b.length, 2); } else { w.u8(0xc6); w.be(b.length, 4); }
    w.raw(b);
  } else {
    const entries = Object.entries(v);
    if (entries.length <= 15) w.u8(0x80 | entries.length); else if (entries.length <= 0xffff) { w.u8(0xde); w.be(entries.length, 2); } else { w.u8(0xdf); w.be(entries.length, 4); }
    for (const [k, x] of entries) { encodeMsgpack(k, w); encodeMsgpack(x, w); }
  }
  return w;
}

// ---------- CBOR (RFC 8949) ----------
function halfToFloat(h: number): number {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, m = h & 0x3ff;
  if (e === 0) return s * 2 ** -14 * (m / 1024);
  if (e === 31) return m ? NaN : s * Infinity;
  return s * 2 ** (e - 15) * (1 + m / 1024);
}

export function decodeCbor(r: Reader, depth = 0): J {
  if (depth > 512) throw new Error("Nesting too deep");
  const ib = r.u8();
  const major = ib >> 5, ai = ib & 0x1f;
  const arg = (): bigint | null => {
    if (ai < 24) return BigInt(ai);
    if (ai === 24) return BigInt(r.u8());
    if (ai === 25) return BigInt(r.u16());
    if (ai === 26) return BigInt(r.u32());
    if (ai === 27) return r.u64();
    if (ai === 31) return null;
    throw new Error(`Reserved additional info ${ai} at offset ${r.p - 1}`);
  };
  const BREAK = () => r.b[r.p] === 0xff;
  switch (major) {
    case 0: { const a = arg(); if (a === null) throw new Error("Indefinite integer"); return big(a); }
    case 1: { const a = arg(); if (a === null) throw new Error("Indefinite integer"); return big(-1n - a); }
    case 2: case 3: {
      const a = arg();
      let bytes: Uint8Array;
      if (a === null) { const chunks: Uint8Array[] = []; while (!BREAK()) { const c = decodeCborChunk(r, major); chunks.push(c); } r.p++; bytes = Uint8Array.from(chunks.flatMap((c) => [...c])); }
      else bytes = r.bytes(Number(a));
      return major === 2 ? { $base64: bytesToBase64(bytes) } : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    case 4: { const a = arg(); const out: J[] = []; if (a === null) { while (!BREAK()) out.push(decodeCbor(r, depth + 1)); r.p++; } else for (let i = 0n; i < a; i++) out.push(decodeCbor(r, depth + 1)); return out; }
    case 5: { const a = arg(); const o: Record<string, J> = {}; const one = () => { const k = decodeCbor(r, depth + 1); o[keyOf(k)] = decodeCbor(r, depth + 1); }; if (a === null) { while (!BREAK()) one(); r.p++; } else for (let i = 0n; i < a; i++) one(); return o; }
    case 6: { const tag = arg(); if (tag === null) throw new Error("Indefinite tag"); const value = decodeCbor(r, depth + 1); return { $tag: big(tag), value }; }
    case 7: {
      if (ai === 20) return false;
      if (ai === 21) return true;
      if (ai === 22) return null;
      if (ai === 23) return { $undefined: true };
      if (ai === 25) return halfToFloat(r.u16());
      if (ai === 26) return r.f32();
      if (ai === 27) return r.f64();
      if (ai < 24) return { $simple: ai };
      if (ai === 24) return { $simple: r.u8() };
      if (ai === 31) throw new Error(`Unexpected break at offset ${r.p - 1}`);
    }
  }
  throw new Error(`Invalid CBOR item 0x${ib.toString(16)} at offset ${r.p - 1}`);
}
function decodeCborChunk(r: Reader, major: number): Uint8Array {
  const ib = r.u8();
  if (ib >> 5 !== major) throw new Error("Indefinite string chunk has the wrong type");
  const ai = ib & 0x1f;
  const n = ai < 24 ? ai : ai === 24 ? r.u8() : ai === 25 ? r.u16() : ai === 26 ? r.u32() : Number(r.u64());
  return r.bytes(n);
}

function cborHead(w: Writer, major: number, n: bigint) {
  if (n < 24n) w.u8((major << 5) | Number(n));
  else if (n <= 0xffn) { w.u8((major << 5) | 24); w.be(n, 1); }
  else if (n <= 0xffffn) { w.u8((major << 5) | 25); w.be(n, 2); }
  else if (n <= 0xffffffffn) { w.u8((major << 5) | 26); w.be(n, 4); }
  else if (n <= 0xffffffffffffffffn) { w.u8((major << 5) | 27); w.be(n, 8); }
  else throw new Error(`${n} does not fit in 64 bits`);
}

export function encodeCbor(v: J, w = new Writer()): Writer {
  if (v === null) w.u8(0xf6);
  else if (v === true) w.u8(0xf5);
  else if (v === false) w.u8(0xf4);
  else if (isInt(v)) { const n = BigInt(v); if (n >= 0n) cborHead(w, 0, n); else cborHead(w, 1, -1n - n); }
  else if (typeof v === "number") { w.u8(0xfb); w.f64(v); }
  else if (typeof v === "string") { const b = w.utf8(v); cborHead(w, 3, BigInt(b.length)); w.raw(b); }
  else if (Array.isArray(v)) { cborHead(w, 4, BigInt(v.length)); for (const x of v) encodeCbor(x, w); }
  else if (isSpecial(v, "$base64")) { const b = parseByteInput(v.$base64 as string, "base64"); cborHead(w, 2, BigInt(b.length)); w.raw(b); }
  else if (Object.keys(v).length === 2 && "$tag" in v && "value" in v && isInt(v.$tag)) { cborHead(w, 6, BigInt(v.$tag)); encodeCbor(v.value!, w); }
  else { const e = Object.entries(v); cborHead(w, 5, BigInt(e.length)); for (const [k, x] of e) { encodeCbor(k, w); encodeCbor(x, w); } }
  return w;
}

/** JSON.parse that keeps integers beyond 2^53 exact when the engine exposes the source text. */
export function parseJsonExact(text: string): J {
  return JSON.parse(text, function (_k, value, ctx?: { source?: string }) {
    if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value) && ctx?.source && /^-?\d+$/.test(ctx.source)) return BigInt(ctx.source);
    return value;
  } as (this: unknown, key: string, value: unknown) => unknown) as J;
}

export const stringifyJson = (v: J) =>
  JSON.stringify(v, (_, x) => (typeof x === "bigint" ? `__BIG__${x}` : typeof x === "number" && !Number.isFinite(x) ? { $float: String(x) } : x), 2).replace(/"__BIG__(-?\d+)"/g, "$1");

export function runMsgpackCborJson(input: string, options: MsgpackCborJsonOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const name = options.format === "msgpack" ? "MessagePack" : "CBOR";
  try {
    if (options.direction === "encode") {
      const v = parseJsonExact(input);
      const bytes = (options.format === "msgpack" ? encodeMsgpack(v) : encodeCbor(v)).done();
      return { output: options.outputEncoding === "hex" ? bytesToHex(bytes, " ").toLowerCase() : bytesToBase64(bytes), error: null };
    }
    const r = new Reader(parseByteInput(input));
    const values: J[] = [];
    while (r.p < r.b.length) values.push(options.format === "msgpack" ? decodeMsgpack(r) : decodeCbor(r));
    const body = values.length === 1 ? stringifyJson(values[0]!) : values.map(stringifyJson).join("\n");
    return { output: `${body}${values.length > 1 ? `\n\n// ${values.length} concatenated ${name} values` : ""}`, error: null };
  } catch (e) {
    return { output: "", error: { message: `${name} ${options.direction === "encode" ? "encoding" : "decoding"} failed: ${(e as Error).message}` } };
  }
}
