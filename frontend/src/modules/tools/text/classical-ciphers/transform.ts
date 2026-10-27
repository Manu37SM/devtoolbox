import type { TransformResult } from "@/lib/tool-transform";
import type { ClassicalCiphersOptions } from "./schema";

const A = 65;
const a = 97;

function shiftLetters(text: string, shift: number): string {
  const s = ((shift % 26) + 26) % 26;
  return text.replace(/[A-Za-z]/g, (ch) => {
    const base = ch <= "Z" ? A : a;
    return String.fromCharCode(((ch.charCodeAt(0) - base + s) % 26) + base);
  });
}

export function caesar(text: string, shift: number): string {
  return shiftLetters(text, shift);
}

export function atbash(text: string): string {
  return text.replace(/[A-Za-z]/g, (ch) => {
    const base = ch <= "Z" ? A : a;
    return String.fromCharCode(base + 25 - (ch.charCodeAt(0) - base));
  });
}

export function rot47(text: string): string {
  return text.replace(/[!-~]/g, (ch) => String.fromCharCode(33 + ((ch.charCodeAt(0) - 33 + 47) % 94)));
}

export function vigenere(text: string, key: string, decrypt: boolean): string {
  const shifts = Array.from(key.toLowerCase().replace(/[^a-z]/g, "")).map((c) => c.charCodeAt(0) - a);
  if (shifts.length === 0) throw new Error("Vigenère needs a key made of letters (A–Z).");
  let i = 0;
  return text.replace(/[A-Za-z]/g, (ch) => {
    const base = ch <= "Z" ? A : a;
    const k = shifts[i++ % shifts.length]! * (decrypt ? -1 : 1);
    return String.fromCharCode((((ch.charCodeAt(0) - base + k) % 26) + 26) % 26 + base);
  });
}

export function convertCipher(input: string, options: ClassicalCiphersOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };
  const decrypt = options.mode === "decrypt";
  try {
    switch (options.cipher) {
      case "rot13":
        return { output: shiftLetters(input, 13), error: null };
      case "caesar":
        return { output: shiftLetters(input, decrypt ? -options.shift : options.shift), error: null };
      case "atbash":
        return { output: atbash(input), error: null };
      case "rot47":
        return { output: rot47(input), error: null };
      case "vigenere":
        return { output: vigenere(input, options.key, decrypt), error: null };
    }
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Cipher failed." } };
  }
}
