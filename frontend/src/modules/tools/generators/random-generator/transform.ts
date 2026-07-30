import type { RandomGeneratorOptions } from "./schema";

const CHARSETS = {
  alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  alpha: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  numeric: "0123456789",
  hex: "0123456789abcdef",
};

export interface RandomGeneratorResult {
  values: string[];
  error: string | null;
}

/** Generates random numbers or strings using the platform CSPRNG. Accepts
 * an injectable random source for deterministic testing. */
export function generateRandom(
  options: RandomGeneratorOptions,
  randomBytes: (length: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): RandomGeneratorResult {
  if (options.kind === "number") {
    return generateNumbers(options, randomBytes);
  }
  return generateStrings(options, randomBytes);
}

function generateNumbers(
  options: Extract<RandomGeneratorOptions, { kind: "number" }>,
  randomBytes: (length: number) => Uint8Array,
): RandomGeneratorResult {
  if (options.min > options.max) {
    return { values: [], error: "Minimum must be less than or equal to maximum." };
  }

  const range = options.max - options.min + 1;
  if (!options.allowDuplicates && options.count > range) {
    return { values: [], error: `Cannot generate ${options.count} unique values from a range of only ${range}.` };
  }

  const results: number[] = [];
  const seen = new Set<number>();
  let attempts = 0;
  const maxAttempts = options.count * 1000 + 1000;

  while (results.length < options.count && attempts < maxAttempts) {
    attempts++;
    const value = options.min + uniformRandomInt(range, randomBytes);
    if (!options.allowDuplicates && seen.has(value)) continue;
    seen.add(value);
    results.push(value);
  }

  return { values: results.map(String), error: null };
}

function generateStrings(
  options: Extract<RandomGeneratorOptions, { kind: "string" }>,
  randomBytes: (length: number) => Uint8Array,
): RandomGeneratorResult {
  const pool = CHARSETS[options.charset];
  const results: string[] = [];

  for (let i = 0; i < options.count; i++) {
    results.push(randomStringFromPool(options.length, pool, randomBytes));
  }

  return { values: results, error: null };
}

// Draws a uniformly distributed integer in [0, range) via rejection
// sampling, using enough random bytes to cover the range without bias.
function uniformRandomInt(range: number, randomBytes: (length: number) => Uint8Array): number {
  if (range <= 1) return 0;
  const bytesNeeded = Math.max(1, Math.ceil(Math.log2(range) / 8));
  const maxValue = 256 ** bytesNeeded;
  const maxUnbiased = maxValue - (maxValue % range);

  while (true) {
    const bytes = randomBytes(bytesNeeded);
    let value = 0;
    for (const b of bytes) value = value * 256 + b;
    if (value < maxUnbiased) return value % range;
  }
}

function randomStringFromPool(length: number, pool: string, randomBytes: (length: number) => Uint8Array): string {
  const maxUnbiased = Math.floor(256 / pool.length) * pool.length;
  let result = "";
  while (result.length < length) {
    const batch = randomBytes(length * 2);
    for (const byte of batch) {
      if (result.length >= length) break;
      if (byte < maxUnbiased) result += pool[byte % pool.length];
    }
  }
  return result;
}
