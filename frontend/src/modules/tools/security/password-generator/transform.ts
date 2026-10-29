import type { PasswordGeneratorOptions } from "./schema";

const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
  safeSymbols: "-_.~",
};
const AMBIGUOUS = new Set("Il1O0o".split(""));

export interface PasswordResult {
  /** All generated passwords, one per line. */
  password: string;
  passwords?: string[];
  entropyBits: number;
  error: string | null;
}

export function generatePassword(
  options: PasswordGeneratorOptions,
  randomBytes: (length: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): PasswordResult {
  const exclude = new Set((options.excludeChars ?? "").split(""));
  const clean = (set: string) =>
    set
      .split("")
      .filter((c) => !(options.excludeAmbiguous && AMBIGUOUS.has(c)) && !exclude.has(c))
      .join("");
  const sets: string[] = [];
  if (options.uppercase) sets.push(clean(CHARSETS.uppercase));
  if (options.lowercase) sets.push(clean(CHARSETS.lowercase));
  if (options.numbers) sets.push(clean(CHARSETS.numbers));
  if (options.symbols) sets.push(clean(options.symbolSet === "safe" ? CHARSETS.safeSymbols : CHARSETS.symbols));
  const pool = [...new Set(sets.join(""))].join("");

  if (pool.length === 0) {
    return { password: "", entropyBits: 0, error: "At least one character set must be enabled." };
  }
  if (options.requireEach && sets.some((set) => set.length === 0)) {
    return { password: "", entropyBits: 0, error: "Every character of an enabled set is excluded, so it cannot be required." };
  }
  if (options.requireEach && sets.length > options.length) {
    return { password: "", entropyBits: 0, error: `Length ${options.length} is too short to include all ${sets.length} character types.` };
  }

  const passwords: string[] = [];
  for (let n = 0; n < (options.count ?? 1); n++) {
    let candidate = randomStringFromPool(options.length, pool, randomBytes);
    // Rejection sampling keeps every accepted password uniformly random among the valid ones.
    let guard = 0;
    while (options.requireEach && !sets.every((set) => [...candidate].some((c) => set.includes(c)))) {
      candidate = randomStringFromPool(options.length, pool, randomBytes);
      if (++guard > 10_000) return { password: "", entropyBits: 0, error: "Could not satisfy every character type; increase the length." };
    }
    passwords.push(candidate);
  }
  const entropyBits = Math.log2(pool.length) * options.length;

  return { password: passwords.join("\n"), passwords, entropyBits, error: null };
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
