import { blake2b, blake3, crc32, keccak, ripemd160, sha224, sha3, sha384, sm3, xxhash64 } from "hash-wasm";
import type { HashAlgorithm, HashGeneratorOptions } from "./schema";

export interface HashResult {
  output: string;
  error: { message: string } | null;
}

export async function hashText(input: string, options: HashGeneratorOptions): Promise<HashResult> {
  if (input.length === 0) return { output: "", error: null };
  if (options.inputFormat === "hex") {
    const hex = input.replace(/0x|\\x/gi, "").replace(/[\s:,-]/g, "");
    if (!/^[0-9a-fA-F]*$/.test(hex)) return { output: "", error: { message: "Hex input may only contain 0-9, a-f and separators" } };
    if (hex.length % 2) return { output: "", error: { message: `Hex input has an odd number of digits (${hex.length})` } };
    return hashBytes(Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16)), options);
  }
  return hashBytes(new TextEncoder().encode(input), options);
}

export async function hashBytes(bytes: Uint8Array, options: HashGeneratorOptions): Promise<HashResult> {
  try {
    const digest = await digestBytes(bytes, options.algorithm);
    return { output: encodeDigest(digest, options), error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Hashing failed" } };
  }
}

export async function hashFile(file: File, options: HashGeneratorOptions): Promise<HashResult> {
  try {
    const buffer = await file.arrayBuffer();
    return await hashBytes(new Uint8Array(buffer), options);
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Could not read this file" } };
  }
}

async function digestBytes(bytes: Uint8Array, algorithm: HashAlgorithm): Promise<Uint8Array> {
  switch (algorithm) {
    case "MD5":
      return md5(bytes);
    case "SHA-1":
    case "SHA-256":
    case "SHA-512":
      return webCryptoDigest(bytes, algorithm);
    default:
      return hexToBytes(await wasmDigest(bytes, algorithm));
  }
}

function wasmDigest(bytes: Uint8Array, algorithm: HashAlgorithm): Promise<string> {
  switch (algorithm) {
    case "SHA-224":
      return sha224(bytes);
    case "SHA-384":
      return sha384(bytes);
    case "SHA3-256":
      return sha3(bytes, 256);
    case "SHA3-512":
      return sha3(bytes, 512);
    case "Keccak-256":
      return keccak(bytes, 256);
    case "BLAKE2b-256":
      return blake2b(bytes, 256);
    case "BLAKE2b-512":
      return blake2b(bytes, 512);
    case "BLAKE3":
      return blake3(bytes);
    case "RIPEMD-160":
      return ripemd160(bytes);
    case "SM3":
      return sm3(bytes);
    case "xxHash64":
      return xxhash64(bytes);
    case "CRC32":
      return crc32(bytes);
    default:
      throw new Error(`Unsupported algorithm ${algorithm}`);
  }
}

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));
}

function encodeDigest(digest: Uint8Array, options: HashGeneratorOptions): string {
  const encoding = options.outputEncoding ?? "hex";
  if (encoding === "hex") {
    const hex = bytesToHex(digest);
    return options.uppercase ? hex.toUpperCase() : hex;
  }
  let bin = "";
  for (const b of digest) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return encoding === "base64" ? b64 : b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function webCryptoDigest(bytes: Uint8Array, algorithm: "SHA-1" | "SHA-256" | "SHA-512") {
  const buffer = await crypto.subtle.digest(algorithm, bytes as BufferSource);
  return new Uint8Array(buffer);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function md5(bytes: Uint8Array): Uint8Array {
  function rotl(x: number, c: number) {
    return (x << c) | (x >>> (32 - c));
  }

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
    14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15,
    21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const msgLenBits = bytes.length * 8;
  const withOne = new Uint8Array(((bytes.length + 8) >>> 6) * 64 + 64);
  withOne.set(bytes);
  withOne[bytes.length] = 0x80;
  const totalLen = withOne.length;
  const view = new DataView(withOne.buffer);
  view.setUint32(totalLen - 8, msgLenBits >>> 0, true);
  view.setUint32(totalLen - 4, Math.floor(msgLenBits / 2 ** 32), true);

  for (let chunkStart = 0; chunkStart < totalLen; chunkStart += 64) {
    const M = new Array<number>(16);
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(chunkStart + j * 4, true);
    }

    let [A, B, C, D] = [a0, b0, c0, d0];

    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i]! + M[g]!) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, s[i]!)) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return out;
}
