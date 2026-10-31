import type { RandomGeneratorInput } from "./schema";

const CHARSETS: Record<string, string> = {
  alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  alpha: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  numeric: "0123456789",
  hex: "0123456789abcdef",
  hexUpper: "0123456789ABCDEF",
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  base64url: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  base32: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/",
};
const AMBIGUOUS = /[0O1lI|5S8B2Z]/g;

export interface RandomGeneratorResult {
  values: string[];
  error: string | null;
}
type Bytes = (length: number) => Uint8Array;
type Opts = RandomGeneratorInput;

export function generateRandom(
  options: Opts,
  randomBytes: Bytes = (n) => crypto.getRandomValues(new Uint8Array(n)),
): RandomGeneratorResult {
  return options.kind === "number" ? generateNumbers(options, randomBytes) : generateStrings(options, randomBytes);
}

function generateNumbers(o: Extract<Opts, { kind: "number" }>, randomBytes: Bytes): RandomGeneratorResult {
  const count = o.count ?? 1;
  const decimals = o.decimals ?? 0;
  const allowDuplicates = o.allowDuplicates ?? true;
  if (!Number.isFinite(o.min) || !Number.isFinite(o.max)) return { values: [], error: "Minimum and maximum must be numbers." };
  if (o.min > o.max) return { values: [], error: "Minimum must be less than or equal to maximum." };
  if (count < 1 || count > 1000) return { values: [], error: "Count must be between 1 and 1000." };

  const scale = 10 ** decimals;
  const lo = Math.ceil(o.min * scale - 1e-9);
  const hi = Math.floor(o.max * scale + 1e-9);
  if (lo > hi) return { values: [], error: "No value with that many decimal places fits between minimum and maximum." };
  const range = hi - lo + 1;
  if (range > 2 ** 48 || Math.max(Math.abs(lo), Math.abs(hi)) > 2 ** 52) {
    return { values: [], error: "The range is too large (limit about 281 trillion values); use a smaller range or fewer decimals." };
  }
  if (!allowDuplicates && count > range) {
    return { values: [], error: `Cannot generate ${count} unique values from a range of only ${range}.` };
  }

  const picks: number[] = [];
  if (!allowDuplicates && range <= 5_000_000 && count * 2 > range) {
    // dense unique draw: partial Fisher-Yates, always terminates
    const pool = new Map<number, number>();
    for (let i = 0; i < count; i++) {
      const j = i + uniformRandomInt(range - i, randomBytes);
      const vi = pool.get(i) ?? i;
      const vj = pool.get(j) ?? j;
      pool.set(j, vi);
      pool.set(i, vj);
      picks.push(lo + vj);
    }
  } else {
    const seen = new Set<number>();
    let attempts = 0;
    const maxAttempts = count * 1000 + 1000;
    while (picks.length < count && attempts++ < maxAttempts) {
      const v = lo + uniformRandomInt(range, randomBytes);
      if (!allowDuplicates && seen.has(v)) continue;
      seen.add(v);
      picks.push(v);
    }
  }
  if (o.sort === "asc") picks.sort((a, b) => a - b);
  else if (o.sort === "desc") picks.sort((a, b) => b - a);

  let values = picks.map((p) => (decimals ? (p / scale).toFixed(decimals) : String(p)));
  if (o.zeroPad && decimals === 0 && o.min >= 0) {
    const w = String(Math.max(...picks.map(Math.abs))).length;
    values = values.map((v) => v.padStart(w, "0"));
  }
  return { values, error: null };
}

function generateStrings(o: Extract<Opts, { kind: "string" }>, randomBytes: Bytes): RandomGeneratorResult {
  const length = o.length ?? 16;
  const count = o.count ?? 1;
  const charset = o.charset ?? "alphanumeric";
  if (length < 1 || length > 256) return { values: [], error: "Length must be between 1 and 256." };
  if (count < 1 || count > 1000) return { values: [], error: "Count must be between 1 and 1000." };

  let chars = charset === "custom" ? o.customCharset ?? "" : CHARSETS[charset] ?? CHARSETS.alphanumeric!;
  if (o.excludeAmbiguous) chars = chars.replace(AMBIGUOUS, "");
  chars = [...new Set([...chars])].join("");
  if (chars.length < 2) {
    return { values: [], error: charset === "custom" ? "Enter at least two different characters for the custom character set." : "The character set is too small after removing ambiguous characters." };
  }
  if (o.unique && count > 1 && Math.log(count) > length * Math.log(chars.length)) {
    return { values: [], error: "Not enough possible strings for that many unique results; increase the length or character set." };
  }

  const out: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (out.length < count && attempts++ < count * 100 + 1000) {
    const s = randomStringFromPool(length, chars, randomBytes);
    if (o.unique && seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  if (o.sort === "asc") out.sort();
  else if (o.sort === "desc") out.sort().reverse();
  const values = out.map((s) => `${o.prefix ?? ""}${s}${o.suffix ?? ""}`);
  return { values, error: null };
}

function uniformRandomInt(range: number, randomBytes: Bytes): number {
  if (range <= 1) return 0;
  const bytesNeeded = Math.max(1, Math.ceil(Math.log2(range) / 8));
  const maxValue = 256 ** bytesNeeded;
  const maxUnbiased = maxValue - (maxValue % range);
  for (let tries = 0; tries < 10_000; tries++) {
    const bytes = randomBytes(bytesNeeded);
    let value = 0;
    for (const b of bytes) value = value * 256 + b;
    if (value < maxUnbiased) return value % range;
  }
  throw new Error("Random source did not produce usable bytes");
}

function randomStringFromPool(length: number, pool: string, randomBytes: Bytes): string {
  const cp = [...pool];
  let result = "";
  for (let i = 0; i < length; i++) result += cp[uniformRandomInt(cp.length, randomBytes)];
  return result;
}
