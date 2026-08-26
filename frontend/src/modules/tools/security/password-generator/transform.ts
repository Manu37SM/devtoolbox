import type { PasswordGeneratorOptions } from "./schema";

const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};
const AMBIGUOUS = new Set("Il1O0o".split(""));

export interface PasswordResult {
  password: string;
  entropyBits: number;
  error: string | null;
}

export function generatePassword(
  options: PasswordGeneratorOptions,
  randomBytes: (length: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): PasswordResult {
  let pool = "";
  if (options.uppercase) pool += CHARSETS.uppercase;
  if (options.lowercase) pool += CHARSETS.lowercase;
  if (options.numbers) pool += CHARSETS.numbers;
  if (options.symbols) pool += CHARSETS.symbols;
  if (options.excludeAmbiguous) pool = pool.split("").filter((c) => !AMBIGUOUS.has(c)).join("");

  if (pool.length === 0) {
    return { password: "", entropyBits: 0, error: "At least one character set must be enabled." };
  }

  const password = randomStringFromPool(options.length, pool, randomBytes);
  const entropyBits = Math.log2(pool.length) * options.length;

  return { password, entropyBits, error: null };
}

function randomStringFromPool(
  length: number,
  pool: string,
  randomBytes: (length: number) => Uint8Array,
): string {

  const maxUnbiased = Math.floor(256 / pool.length) * pool.length;
  let result = "";
  while (result.length < length) {
    const batch = randomBytes(length * 2);
    for (const byte of batch) {
      if (result.length >= length) break;
      if (byte < maxUnbiased) {
        result += pool[byte % pool.length];
      }
    }
  }
  return result;
}
