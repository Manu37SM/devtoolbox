import type { TransformResult } from "@/lib/tool-transform";
import type { Base58Base62ConverterOptions } from "./schema";

export const ALPHABETS: Record<Base58Base62ConverterOptions["alphabet"], string> = {
  base58: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  flickr: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  ripple: "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz",
  base62: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
};

export function encodeBytes(bytes: Uint8Array, alphabet: string): string {
  const base = BigInt(alphabet.length);
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = "";
  while (n > 0n) {
    out = alphabet[Number(n % base)]! + out;
    n /= base;
  }
  return alphabet[0]!.repeat(zeros) + out;
}

export function decodeToBytes(text: string, alphabet: string): Uint8Array {
  const base = BigInt(alphabet.length);
  let zeros = 0;
  while (zeros < text.length && text[zeros] === alphabet[0]) zeros++;
  let n = 0n;
  for (const ch of text) {
    const i = alphabet.indexOf(ch);
    if (i < 0) throw new Error(`Invalid character "${ch}" for this alphabet`);
    n = n * base + BigInt(i);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  return Uint8Array.from([...new Array<number>(zeros).fill(0), ...bytes]);
}

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
function fromHex(h: string): Uint8Array {
  const s = h.replace(/\s+/g, "").replace(/^0x/i, "");
  if (s.length % 2 || /[^0-9a-f]/i.test(s)) throw new Error("Hex input must have an even number of hex digits");
  return Uint8Array.from(s.match(/../g) ?? [], (x) => parseInt(x, 16));
}

export function convertBase58(input: string, options: Base58Base62ConverterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const alphabet = ALPHABETS[options.alphabet];
  try {
    if (options.direction === "encode") {
      const bytes = options.binaryFormat === "hex" ? fromHex(input) : new TextEncoder().encode(input);
      return { output: encodeBytes(bytes, alphabet), error: null };
    }
    const bytes = decodeToBytes(input.trim(), alphabet);
    if (options.binaryFormat === "hex") return { output: toHex(bytes), error: null };
    return { output: new TextDecoder("utf-8", { fatal: true }).decode(bytes), error: null };
  } catch (e) {
    const msg = e instanceof TypeError ? "Decoded bytes are not valid UTF-8 text; switch the binary format to hex" : (e as Error).message;
    return { output: "", error: { message: msg } };
  }
}
