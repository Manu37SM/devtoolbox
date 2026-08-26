import type { TotpAlgorithm, TotpGeneratorOptions } from "./schema";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export interface TotpResult {
  code: string;
  secondsRemaining: number;
  error: string | null;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  if (clean.length === 0) return new Uint8Array(0);
  let bits = "";
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`"${ch}" is not a valid base32 character (A-Z, 2-7).`);
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return output;
}

function counterToBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let c = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = Number(c & 0xffn);
    c >>= 8n;
  }
  return bytes;
}

export async function hotp(keyBytes: Uint8Array, counter: number, digits: number, algorithm: TotpAlgorithm): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, counterToBytes(counter) as BufferSource);
  const hmac = new Uint8Array(signature);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = binCode % 10 ** digits;
  return otp.toString().padStart(digits, "0");
}

export async function generateTotp(options: TotpGeneratorOptions, time: number = Date.now() / 1000): Promise<TotpResult> {
  try {
    const key = base32Decode(options.secret);
    if (key.length === 0) {
      return { code: "", secondsRemaining: 0, error: "Secret must be a non-empty base32 string." };
    }
    const counter = Math.floor(time / options.period);
    const code = await hotp(key, counter, options.digits, options.algorithm);
    const secondsRemaining = options.period - (Math.floor(time) % options.period);
    return { code, secondsRemaining, error: null };
  } catch (err) {
    return { code: "", secondsRemaining: 0, error: err instanceof Error ? err.message : "Could not generate a TOTP code." };
  }
}

export function buildOtpauthUri(options: TotpGeneratorOptions, label: string, issuer?: string): string {
  const encodedLabel = encodeURIComponent(issuer ? `${issuer}:${label}` : label);
  const params = new URLSearchParams({
    secret: options.secret.toUpperCase().replace(/\s+/g, ""),
    algorithm: options.algorithm.replace("-", ""),
    digits: String(options.digits),
    period: String(options.period),
  });
  if (issuer) params.set("issuer", issuer);
  return `otpauth://totp/${encodedLabel}?${params.toString()}`;
}
