import type { TransformResult } from "@/lib/tool-transform";
import type { SshKeyFingerprintOptions } from "./schema";

const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export function sha256(data: Uint8Array): Uint8Array {
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const len = data.length;
  const padded = new Uint8Array(Math.ceil((len + 9) / 64) * 64);
  padded.set(data);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((len * 8) / 2 ** 32));
  view.setUint32(padded.length - 4, (len * 8) >>> 0);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as [number, number, number, number, number, number, number, number];
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i]! + w[i]!) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0]! + a) >>> 0; h[1] = (h[1]! + b) >>> 0; h[2] = (h[2]! + c) >>> 0; h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0; h[5] = (h[5]! + f) >>> 0; h[6] = (h[6]! + g) >>> 0; h[7] = (h[7]! + hh) >>> 0;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  h.forEach((v, i) => ov.setUint32(i * 4, v));
  return out;
}

const MD5_S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export function md5(data: Uint8Array): Uint8Array {
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const len = data.length;
  const padded = new Uint8Array(Math.ceil((len + 9) / 64) * 64);
  padded.set(data);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (len * 8) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor((len * 8) / 2 ** 32), true);
  for (let off = 0; off < padded.length; off += 64) {
    const m = Array.from({ length: 16 }, (_, i) => view.getUint32(off + i * 4, true));
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      f = (f + a + MD5_K[i]! + m[g]!) >>> 0;
      a = d; d = c; c = b;
      b = (b + ((f << MD5_S[i]!) | (f >>> (32 - MD5_S[i]!)))) >>> 0;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((v, i) => ov.setUint32(i * 4, v, true));
  return out;
}

const toBase64 = (b: Uint8Array) => { let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s); };
const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0"));

export function readSshString(blob: Uint8Array, offset: number): { bytes: Uint8Array; next: number } {
  if (offset + 4 > blob.length) throw new Error("Key blob is truncated");
  const len = new DataView(blob.buffer, blob.byteOffset).getUint32(offset);
  if (offset + 4 + len > blob.length) throw new Error("Key blob is truncated");
  return { bytes: blob.slice(offset + 4, offset + 4 + len), next: offset + 4 + len };
}

export function bitLength(mpint: Uint8Array): number {
  let i = 0;
  while (i < mpint.length && mpint[i] === 0) i++;
  if (i === mpint.length) return 0;
  return (mpint.length - i - 1) * 8 + (32 - Math.clz32(mpint[i]!));
}

export interface KeyInfo { type: string; label: string; bits: number | null; comment: string; sha256: string; md5: string }

const LABELS: Record<string, string> = { "ssh-rsa": "RSA", "ssh-ed25519": "ED25519", "ssh-dss": "DSA", "ecdsa-sha2-nistp256": "ECDSA", "ecdsa-sha2-nistp384": "ECDSA", "ecdsa-sha2-nistp521": "ECDSA", "sk-ssh-ed25519@openssh.com": "ED25519-SK", "sk-ecdsa-sha2-nistp256@openssh.com": "ECDSA-SK" };

export function analyzeKey(line: string): KeyInfo {
  const parts = line.trim().replace(/^(?:[^\s]+\s+)?(?=(ssh-|ecdsa-|sk-))/, "").split(/\s+/);
  const typeHint = parts[0] ?? "";
  const b64 = parts[1] ?? "";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new Error("Expected an OpenSSH public key line: <type> <base64> [comment]");
  let blob: Uint8Array;
  try { blob = fromBase64(b64); } catch { throw new Error("Expected an OpenSSH public key line: <type> <base64> [comment]"); }
  const t = readSshString(blob, 0);
  const type = new TextDecoder().decode(t.bytes);
  if (type !== typeHint) throw new Error(`Key type "${typeHint}" does not match the encoded type "${type}"`);
  let bits: number | null = null;
  if (type === "ssh-rsa") { const e = readSshString(blob, t.next); bits = bitLength(readSshString(blob, e.next).bytes); }
  else if (type === "ssh-dss") bits = bitLength(readSshString(blob, t.next).bytes);
  else if (type === "ssh-ed25519" || type === "sk-ssh-ed25519@openssh.com") bits = 256;
  else if (type.startsWith("ecdsa-sha2-nistp") || type.startsWith("sk-ecdsa-sha2-nistp")) bits = Number(/nistp(\d+)/.exec(type)![1]);
  return {
    type, label: LABELS[type] ?? type, bits, comment: parts.slice(2).join(" "),
    sha256: "SHA256:" + toBase64(sha256(blob)).replace(/=+$/, ""),
    md5: "MD5:" + hex(md5(blob)).join(":"),
  };
}

export function fingerprintKeys(input: string, options: SshKeyFingerprintOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const out: string[] = [];
  const bad: string[] = [];
  lines.forEach((l, i) => {
    try {
      if (l.startsWith("-----BEGIN")) throw new Error("This looks like a PEM block; paste the public key line (ssh-rsa / ssh-ed25519 …) instead");
      const k = analyzeKey(l);
      const rows = [`${k.bits ?? "?"} ${k.label}${k.comment ? `  ${k.comment}` : ""}`];
      if (options.format !== "md5") rows.push(`  ${k.sha256}`);
      if (options.format !== "sha256") rows.push(`  ${k.md5}`);
      if (k.type === "ssh-rsa" && k.bits !== null && k.bits < 2048) rows.push("  ⚠ RSA keys under 2048 bits are considered weak");
      if (k.type === "ssh-dss") rows.push("  ⚠ DSA keys are deprecated and disabled in OpenSSH 7+");
      out.push(rows.join("\n"));
    } catch (e) {
      bad.push(`Line ${i + 1}: ${(e as Error).message}`);
    }
  });
  return { output: out.join("\n\n"), error: bad.length ? { message: bad[0]! + (bad.length > 1 ? ` (+${bad.length - 1} more)` : "") } : null };
}
