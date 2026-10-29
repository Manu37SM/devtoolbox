import type { TransformResult } from "@/lib/tool-transform";
import { bytesToHex } from "@/lib/byte-input";
import type { LegacyTextEncodingsOptions } from "./schema";

const utf8 = (s: string) => new TextEncoder().encode(s);

// ---------- Quoted-Printable (RFC 2045) ----------
export function qpEncode(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return lines.map((line) => {
    const bytes = utf8(line);
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i]!;
      const last = i === bytes.length - 1;
      out += (b >= 33 && b <= 126 && b !== 61) || ((b === 32 || b === 9) && !last) ? String.fromCharCode(b) : `=${b.toString(16).toUpperCase().padStart(2, "0")}`;
    }
    const wrapped: string[] = [];
    while (out.length > 76) {
      let cut = 75;
      const eq = out.lastIndexOf("=", cut - 1);
      if (eq > cut - 3) cut = eq;
      wrapped.push(`${out.slice(0, cut)}=`);
      out = out.slice(cut);
    }
    wrapped.push(out);
    return wrapped.join("\n");
  }).join("\n");
}

export function qpDecode(text: string): Uint8Array {
  const src = text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/=\n/g, "");
  const out: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (ch === "=" && /^[0-9A-Fa-f]{2}$/.test(src.slice(i + 1, i + 3))) { out.push(parseInt(src.slice(i + 1, i + 3), 16)); i += 2; }
    else for (const b of utf8(ch)) out.push(b);
  }
  return Uint8Array.from(out);
}

// ---------- Ascii85 (Adobe) ----------
export function a85Encode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 4) {
    const chunk = bytes.subarray(i, i + 4);
    const n = chunk.length;
    let v = 0;
    for (let k = 0; k < 4; k++) v = v * 256 + (chunk[k] ?? 0);
    if (n === 4 && v === 0) { out += "z"; continue; }
    const digits: string[] = [];
    for (let k = 0; k < 5; k++) { digits.unshift(String.fromCharCode(33 + (v % 85))); v = Math.floor(v / 85); }
    out += digits.slice(0, n + 1).join("");
  }
  return `<~${out}~>`;
}

export function a85Decode(text: string): Uint8Array {
  let s = text.replace(/\s+/g, "");
  if (s.startsWith("<~")) s = s.slice(2);
  if (s.endsWith("~>")) s = s.slice(0, -2);
  const out: number[] = [];
  let group: number[] = [];
  const flush = (len: number) => {
    const g = [...group];
    while (g.length < 5) g.push(84);
    let v = 0;
    for (const c of g) v = v * 85 + c;
    if (v > 0xffffffff) throw new Error("Ascii85 group overflows 32 bits.");
    const b = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    out.push(...b.slice(0, len - 1));
    group = [];
  };
  for (const ch of s) {
    if (ch === "z" && group.length === 0) { out.push(0, 0, 0, 0); continue; }
    const c = ch.charCodeAt(0) - 33;
    if (c < 0 || c > 84) throw new Error(`Invalid Ascii85 character "${ch}".`);
    group.push(c);
    if (group.length === 5) flush(5);
  }
  if (group.length === 1) throw new Error("Ascii85 data ends with a single character.");
  if (group.length) flush(group.length);
  return Uint8Array.from(out);
}

// ---------- Z85 (ZeroMQ RFC 32) ----------
const Z85 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
export function z85Encode(bytes: Uint8Array): string {
  if (bytes.length % 4) throw new Error(`Z85 needs a multiple of 4 bytes (got ${bytes.length}). Pad the data first.`);
  let out = "";
  for (let i = 0; i < bytes.length; i += 4) {
    let v = ((bytes[i]! << 24) >>> 0) + (bytes[i + 1]! << 16) + (bytes[i + 2]! << 8) + bytes[i + 3]!;
    const d: string[] = [];
    for (let k = 0; k < 5; k++) { d.unshift(Z85[v % 85]!); v = Math.floor(v / 85); }
    out += d.join("");
  }
  return out;
}
export function z85Decode(text: string): Uint8Array {
  const s = text.replace(/\s+/g, "");
  if (s.length % 5) throw new Error(`Z85 text length must be a multiple of 5 (got ${s.length}).`);
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 5) {
    let v = 0;
    for (const ch of s.slice(i, i + 5)) { const d = Z85.indexOf(ch); if (d < 0) throw new Error(`Invalid Z85 character "${ch}".`); v = v * 85 + d; }
    if (v > 0xffffffff) throw new Error("Z85 group overflows 32 bits.");
    out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
  }
  return Uint8Array.from(out);
}

// ---------- Base45 (RFC 9285) ----------
const B45 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
export function b45Encode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      const n = bytes[i]! * 256 + bytes[i + 1]!;
      out += B45[n % 45]! + B45[Math.floor(n / 45) % 45]! + B45[Math.floor(n / 2025)]!;
    } else {
      const n = bytes[i]!;
      out += B45[n % 45]! + B45[Math.floor(n / 45)]!;
    }
  }
  return out;
}
export function b45Decode(text: string): Uint8Array {
  const s = text.replace(/[\r\n]+/g, "");
  if (s.length % 3 === 1) throw new Error("Base45 text length cannot be 1 more than a multiple of 3.");
  const val = (ch: string) => { const v = B45.indexOf(ch); if (v < 0) throw new Error(`Invalid Base45 character "${ch}".`); return v; };
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 3) {
    if (i + 2 < s.length) {
      const n = val(s[i]!) + val(s[i + 1]!) * 45 + val(s[i + 2]!) * 2025;
      if (n > 0xffff) throw new Error("Base45 triplet is out of range.");
      out.push(n >> 8, n & 255);
    } else {
      const n = val(s[i]!) + val(s[i + 1]!) * 45;
      if (n > 0xff) throw new Error("Base45 pair is out of range.");
      out.push(n);
    }
  }
  return Uint8Array.from(out);
}

// ---------- uuencode ----------
const uuChar = (v: number) => (v === 0 ? "`" : String.fromCharCode(32 + v));
export function uuEncode(bytes: Uint8Array, name = "data.txt"): string {
  const lines: string[] = [`begin 644 ${name}`];
  for (let i = 0; i < bytes.length; i += 45) {
    const chunk = bytes.subarray(i, i + 45);
    let line = uuChar(chunk.length);
    for (let k = 0; k < chunk.length; k += 3) {
      const a = chunk[k]!, b = chunk[k + 1] ?? 0, c = chunk[k + 2] ?? 0;
      line += uuChar(a >> 2) + uuChar(((a & 3) << 4) | (b >> 4)) + uuChar(((b & 15) << 2) | (c >> 6)) + uuChar(c & 63);
    }
    lines.push(line);
  }
  lines.push("`", "end");
  return lines.join("\n");
}
export function uuDecode(text: string): Uint8Array {
  const out: number[] = [];
  const val = (ch: string) => (ch.charCodeAt(0) - 32) & 63;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line || /^begin\s/.test(line) || line === "end") continue;
    const n = val(line[0]!);
    if (n === 0) continue;
    const body = line.slice(1).padEnd(Math.ceil(n / 3) * 4, "`");
    const bytes: number[] = [];
    for (let k = 0; k < body.length; k += 4) {
      const [a, b, c, d] = [0, 1, 2, 3].map((j) => val(body[k + j] ?? "`")) as [number, number, number, number];
      bytes.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d);
    }
    out.push(...bytes.slice(0, n));
  }
  return Uint8Array.from(out);
}

function show(bytes: Uint8Array): string {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { return `(binary, ${bytes.length} bytes, shown as hex)\n${bytesToHex(bytes, " ")}`; }
}

export function runLegacyTextEncodings(input: string, options: LegacyTextEncodingsOptions): TransformResult {
  if (!input) return { output: "", error: null };
  try {
    if (options.direction === "encode") {
      switch (options.encoding) {
        case "quoted-printable": return { output: qpEncode(input), error: null };
        case "ascii85": return { output: a85Encode(utf8(input)), error: null };
        case "z85": return { output: z85Encode(utf8(input)), error: null };
        case "base45": return { output: b45Encode(utf8(input)), error: null };
        case "uuencode": return { output: uuEncode(utf8(input)), error: null };
      }
    }
    const t = input.trim();
    const bytes = options.encoding === "quoted-printable" ? qpDecode(input) : options.encoding === "ascii85" ? a85Decode(t) : options.encoding === "z85" ? z85Decode(t) : options.encoding === "base45" ? b45Decode(t) : uuDecode(input);
    return { output: show(bytes), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
