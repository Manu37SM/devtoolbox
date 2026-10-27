import type { TransformResult } from "@/lib/tool-transform";
import type { Base32Options, Base32Variant } from "./schema";

const ALPHABETS: Record<Base32Variant, string> = {
  rfc4648: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  base32hex: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
  crockford: "0123456789ABCDEFGHJKMNPQRSTVWXYZ",
};

// Unpadded Base32 lengths that cannot occur: 1, 3 and 6 mod 8.
const INVALID_REMAINDERS = new Set([1, 3, 6]);

export function base32EncodeBytes(bytes: Uint8Array, variant: Base32Variant, padding: boolean): string {
  const alphabet = ALPHABETS[variant];
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  if (padding && variant !== "crockford") {
    while (out.length % 8 !== 0) out += "=";
  }
  return out;
}

export function base32DecodeToBytes(input: string, variant: Base32Variant): Uint8Array {
  const alphabet = ALPHABETS[variant];
  let cleaned = input.replace(/\s+/g, "").toUpperCase();
  if (variant === "crockford") {
    cleaned = cleaned.replace(/-/g, "").replace(/[IL]/g, "1").replace(/O/g, "0");
  }
  cleaned = cleaned.replace(/=+$/, "");
  if (INVALID_REMAINDERS.has(cleaned.length % 8)) {
    throw new Error("Invalid Base32 length — the input looks truncated.");
  }

  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of cleaned) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid character "${ch}" for this Base32 alphabet.`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
    value &= (1 << bits) - 1;
  }
  return Uint8Array.from(bytes);
}

export function transformBase32(input: string, options: Base32Options): TransformResult {
  if (input.length === 0) return { output: "", error: null };
  try {
    if (options.mode === "encode") {
      const bytes = new TextEncoder().encode(input);
      return { output: base32EncodeBytes(bytes, options.variant, options.padding), error: null };
    }
    const bytes = base32DecodeToBytes(input, options.variant);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { output: text, error: null };
  } catch (e) {
    const message =
      e instanceof TypeError ? "Decoded bytes are not valid UTF-8 text." : e instanceof Error ? e.message : "Could not decode input.";
    return { output: "", error: { message } };
  }
}
