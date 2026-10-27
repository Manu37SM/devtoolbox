import type { TransformResult } from "@/lib/tool-transform";
import type { UlidNanoidGeneratorOptions } from "./schema";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const NANOID_DEFAULT_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

type Rand = (n: number) => Uint8Array;
const defaultRand: Rand = (n) => crypto.getRandomValues(new Uint8Array(n));

export function encodeUlid(timeMs: number, random: Uint8Array): string {
  if (timeMs < 0 || timeMs > 2 ** 48 - 1) throw new Error("Timestamp is outside the 48-bit ULID range.");
  let value = BigInt(timeMs);
  for (const b of random.slice(0, 10)) value = (value << 8n) | BigInt(b);
  let out = "";
  for (let i = 0; i < 26; i++) {
    out = CROCKFORD[Number(value & 31n)] + out;
    value >>= 5n;
  }
  return out;
}

export function decodeUlid(ulid: string): { timeMs: number; iso: string; randomnessHex: string } {
  const s = ulid.trim().toUpperCase();
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(s)) throw new Error(`"${ulid.trim()}" isn't a valid ULID (26 Crockford Base32 characters).`);
  if (s[0]! > "7") throw new Error("ULID overflow: the first character can be at most 7.");
  let value = 0n;
  for (const ch of s) value = (value << 5n) | BigInt(CROCKFORD.indexOf(ch));
  const timeMs = Number(value >> 80n);
  const randomness = value & ((1n << 80n) - 1n);
  return { timeMs, iso: new Date(timeMs).toISOString(), randomnessHex: randomness.toString(16).padStart(20, "0") };
}

export function nanoid(size: number, alphabet: string, rand: Rand = defaultRand): string {
  if (alphabet.length < 2 || alphabet.length > 256) throw new Error("The alphabet must contain between 2 and 256 characters.");
  const chars = Array.from(new Set(alphabet));
  const mask = (2 << (31 - Math.clz32((chars.length - 1) | 1))) - 1;
  let id = "";
  while (id.length < size) {
    const bytes = rand(Math.ceil((1.6 * mask * (size - id.length)) / chars.length) + 8);
    for (const b of bytes) {
      const idx = b & mask; // rejection sampling: no modulo bias
      if (idx < chars.length) {
        id += chars[idx];
        if (id.length === size) break;
      }
    }
  }
  return id;
}

export function generateIds(input: string, options: UlidNanoidGeneratorOptions, _nonce = 0): TransformResult {
  if (options.mode === "decode") {
    const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return { output: "", error: null };
    try {
      return {
        output: lines.map((l) => {
          const d = decodeUlid(l);
          return `${l}\n  time        ${d.iso}  (${d.timeMs} ms since epoch)\n  randomness  0x${d.randomnessHex}`;
        }).join("\n\n"),
        error: null,
      };
    } catch (e) {
      return { output: "", error: { message: e instanceof Error ? e.message : "Could not decode." } };
    }
  }
  const count = Math.max(1, Math.min(1000, Math.floor(options.count)));
  try {
    const ids = Array.from({ length: count }, () => {
      if (options.kind === "ulid") {
        const id = encodeUlid(Date.now(), defaultRand(10));
        return options.lowercase ? id.toLowerCase() : id;
      }
      return nanoid(Math.max(1, Math.min(256, Math.floor(options.length))), options.alphabet || NANOID_DEFAULT_ALPHABET);
    });
    return { output: ids.join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not generate IDs." } };
  }
}
