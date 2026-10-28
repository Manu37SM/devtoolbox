import type { TransformResult } from "@/lib/tool-transform";
import type { HtpasswdGeneratorOptions } from "./schema";

const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

export function md5(data: Uint8Array): Uint8Array {
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const len = data.length;
  const p = new Uint8Array(Math.ceil((len + 9) / 64) * 64);
  p.set(data); p[len] = 0x80;
  const dv = new DataView(p.buffer);
  dv.setUint32(p.length - 8, (len * 8) >>> 0, true);
  dv.setUint32(p.length - 4, Math.floor((len * 8) / 2 ** 32), true);
  for (let off = 0; off < p.length; off += 64) {
    const m = Array.from({ length: 16 }, (_, i) => dv.getUint32(off + i * 4, true));
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      f = (f + a + K[i]! + m[g]!) >>> 0;
      a = d; d = c; c = b;
      b = (b + ((f << S[i]!) | (f >>> (32 - S[i]!)))) >>> 0;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((v, i) => ov.setUint32(i * 4, v, true));
  return out;
}

export function sha1(data: Uint8Array): Uint8Array {
  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const len = data.length;
  const p = new Uint8Array(Math.ceil((len + 9) / 64) * 64);
  p.set(data); p[len] = 0x80;
  const dv = new DataView(p.buffer);
  dv.setUint32(p.length - 8, Math.floor((len * 8) / 2 ** 32));
  dv.setUint32(p.length - 4, (len * 8) >>> 0);
  const w = new Uint32Array(80);
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  for (let off = 0; off < p.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!, 1);
    let [a, b, c, d, e] = h as [number, number, number, number, number];
    for (let i = 0; i < 80; i++) {
      const [f, k] = i < 20 ? [(b & c) | (~b & d), 0x5a827999] : i < 40 ? [b ^ c ^ d, 0x6ed9eba1] : i < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6];
      const t = (rotl(a, 5) + f! + e + k! + w[i]!) >>> 0;
      e = d; d = c; c = rotl(b, 30) >>> 0; b = a; a = t;
    }
    h[0] = (h[0]! + a) >>> 0; h[1] = (h[1]! + b) >>> 0; h[2] = (h[2]! + c) >>> 0; h[3] = (h[3]! + d) >>> 0; h[4] = (h[4]! + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const ov = new DataView(out.buffer);
  h.forEach((v, i) => ov.setUint32(i * 4, v));
  return out;
}

const cat = (...parts: Uint8Array[]) => { const o = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; };
const enc = (s: string) => new TextEncoder().encode(s);
const ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const to64 = (v: number, n: number) => { let s = ""; while (n-- > 0) { s += ITOA64[v & 0x3f]; v >>>= 6; } return s; };

/** Apache APR1-MD5 (`$apr1$`), as produced by `htpasswd -m`. */
export function apr1(password: string, salt: string): string {
  const pw = enc(password), sl = enc(salt), magic = enc("$apr1$");
  const alt = md5(cat(pw, sl, pw));
  const parts: Uint8Array[] = [pw, magic, sl];
  for (let pl = pw.length; pl > 0; pl -= 16) parts.push(alt.slice(0, Math.min(16, pl)));
  for (let i = pw.length; i > 0; i >>= 1) parts.push(i & 1 ? Uint8Array.of(0) : pw.slice(0, 1));
  let f = md5(cat(...parts));
  for (let i = 0; i < 1000; i++) {
    const r: Uint8Array[] = [];
    r.push(i & 1 ? pw : f);
    if (i % 3) r.push(sl);
    if (i % 7) r.push(pw);
    r.push(i & 1 ? f : pw);
    f = md5(cat(...r));
  }
  const g = (a: number, b: number, c: number) => (f[a]! << 16) | (f[b]! << 8) | f[c]!;
  return `$apr1$${salt}$` + to64(g(0, 6, 12), 4) + to64(g(1, 7, 13), 4) + to64(g(2, 8, 14), 4) + to64(g(3, 9, 15), 4) + to64(g(4, 10, 5), 4) + to64(f[11]!, 2);
}

export function sha1Entry(password: string): string {
  const d = sha1(enc(password));
  let s = ""; for (const b of d) s += String.fromCharCode(b);
  return "{SHA}" + btoa(s);
}

export function randomSalt(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ITOA64[b & 0x3f]).join("");
}

/** Input lines: `user:password`. Output: htpasswd lines. `salt` is injectable for tests. */
export function generateHtpasswd(input: string, o: HtpasswdGeneratorOptions, _nonce = 0, salt?: () => string): TransformResult {
  const lines = input.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return { output: "", error: null };
  const out: string[] = [];
  const users = new Set<string>();
  for (const [i, l] of lines.entries()) {
    const idx = l.indexOf(":");
    if (idx <= 0) return { output: "", error: { message: 'Expected "user:password"', line: i + 1 } };
    const user = l.slice(0, idx), pw = l.slice(idx + 1);
    if (/[\s:]/.test(user)) return { output: "", error: { message: "Usernames cannot contain spaces or colons", line: i + 1 } };
    if (users.has(user)) return { output: "", error: { message: `Duplicate user "${user}"`, line: i + 1 } };
    if (pw.length === 0) return { output: "", error: { message: "Password is empty", line: i + 1 } };
    users.add(user);
    out.push(`${user}:${o.algorithm === "apr1" ? apr1(pw, (salt ?? randomSalt)()) : sha1Entry(pw)}`);
  }
  return { output: out.join("\n") + "\n", error: null };
}
