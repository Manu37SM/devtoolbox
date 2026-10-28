import type { TransformResult } from "@/lib/tool-transform";
import type { PassphraseGeneratorOptions } from "./schema";
import { EFF_WORDLIST } from "./wordlist";

const SEPARATORS: Record<PassphraseGeneratorOptions["separator"], string> = { hyphen: "-", space: " ", dot: ".", underscore: "_", none: "" };

type RandomU32 = () => number;
const secureU32: RandomU32 = () => crypto.getRandomValues(new Uint32Array(1))[0]!;

/** Uniform integer in [0, n) by rejection sampling — no modulo bias. */
export function randomBelow(n: number, rand: RandomU32 = secureU32): number {
  const limit = Math.floor(2 ** 32 / n) * n;
  let x = rand();
  while (x >= limit) x = rand();
  return x % n;
}

export function entropyBits(words: number, listSize: number, addNumber: boolean): number {
  return words * Math.log2(listSize) + (addNumber ? Math.log2(10) : 0);
}

export function strengthLabel(bits: number): string {
  if (bits < 50) return "weak";
  if (bits < 64) return "fair";
  if (bits < 80) return "good";
  if (bits < 100) return "strong";
  return "very strong";
}

export function makePassphrase(o: PassphraseGeneratorOptions, rand: RandomU32 = secureU32): string {
  const picked = Array.from({ length: o.words }, () => {
    const w = EFF_WORDLIST[randomBelow(EFF_WORDLIST.length, rand)]!;
    return o.capitalize ? w[0]!.toUpperCase() + w.slice(1) : w;
  });
  let out = picked.join(SEPARATORS[o.separator]);
  if (o.addNumber) out += SEPARATORS[o.separator] + randomBelow(10, rand);
  return out;
}

export function generatePassphrases(_input: string, o: PassphraseGeneratorOptions, _nonce = 0, rand: RandomU32 = secureU32): TransformResult {
  const words = Math.max(3, Math.min(20, Math.floor(o.words)));
  const count = Math.max(1, Math.min(20, Math.floor(o.count)));
  const opts = { ...o, words };
  const lines = Array.from({ length: count }, () => makePassphrase(opts, rand));
  const bits = entropyBits(words, EFF_WORDLIST.length, o.addNumber);
  lines.push("", `${words} words from the ${EFF_WORDLIST.length}-word EFF large list ≈ ${bits.toFixed(1)} bits of entropy (${strengthLabel(bits)}).`);
  if (words < 5) lines.push("Use at least 5 words for anything protecting valuable data (6 is the usual recommendation).");
  lines.push("Generated in your browser with crypto.getRandomValues; nothing is sent anywhere. Don't reuse a passphrase across accounts.");
  return { output: lines.join("\n"), error: null };
}
