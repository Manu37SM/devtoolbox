import type { HashGeneratorOptions } from "./schema";

export interface HashResult {
  output: string;
  error: { message: string } | null;
}

/** Hashing is inherently async (WebCrypto's SubtleCrypto), so unlike most
 * transforms this one returns a Promise — still a pure function with no
 * other side effects, and it works identically in the browser, Node
 * (Vitest), and a Worker since `crypto.subtle` is available in all three. */
export async function hashText(input: string, options: HashGeneratorOptions): Promise<HashResult> {
  if (input.length === 0) return { output: "", error: null };

  try {
    const bytes = new TextEncoder().encode(input);
    const digest = options.algorithm === "MD5" ? md5(bytes) : await webCryptoDigest(bytes, options.algorithm);
    const hex = bytesToHex(digest);
    return { output: options.uppercase ? hex.toUpperCase() : hex, error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Hashing failed" } };
  }
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

// ── Pure-JS MD5 (WebCrypto doesn't implement it) ──────────────────────────
// Reference implementation adapted for Uint8Array input/output, no
// external dependency, DOM-free.
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
