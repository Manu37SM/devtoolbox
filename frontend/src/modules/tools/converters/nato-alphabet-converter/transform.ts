import type { TransformResult } from "@/lib/tool-transform";
import type { NatoAlphabetConverterOptions } from "./schema";

const LETTERS: Record<string, string> = {
  A: "Alfa", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot", G: "Golf", H: "Hotel",
  I: "India", J: "Juliett", K: "Kilo", L: "Lima", M: "Mike", N: "November", O: "Oscar", P: "Papa",
  Q: "Quebec", R: "Romeo", S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey",
  X: "X-ray", Y: "Yankee", Z: "Zulu",
};
const DIGITS_PLAIN = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const DIGITS_ICAO = ["Zero", "Wun", "Too", "Tree", "Fower", "Fife", "Six", "Seven", "Ait", "Niner"];

function reverseMap(icaoDigits: boolean): Map<string, string> {
  const map = new Map<string, string>();
  for (const [ch, word] of Object.entries(LETTERS)) map.set(word.toLowerCase(), ch);
  map.set("alpha", "A");
  map.set("juliet", "J");
  map.set("xray", "X");
  for (const list of [DIGITS_PLAIN, DIGITS_ICAO]) list.forEach((w, i) => map.set(w.toLowerCase(), String(i)));
  void icaoDigits;
  return map;
}

export function convertNato(input: string, options: NatoAlphabetConverterOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  if (options.mode === "text-to-nato") {
    const digits = options.icaoDigits ? DIGITS_ICAO : DIGITS_PLAIN;
    const words = input.trim().split(/\s+/).map((word) =>
      Array.from(word)
        .map((ch) => {
          const upper = ch.toUpperCase();
          if (LETTERS[upper]) return LETTERS[upper];
          if (/[0-9]/.test(ch)) return digits[Number(ch)]!;
          return ch; // punctuation passes through unchanged
        })
        .join(" "),
    );
    return { output: words.join(" / "), error: null };
  }

  const reverse = reverseMap(options.icaoDigits);
  const unknown: string[] = [];
  const decoded = input
    .trim()
    .split(/\s*[/|]\s*|\n+/)
    .map((group) =>
      group
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => {
          const hit = reverse.get(token.toLowerCase());
          if (hit !== undefined) return hit;
          if (token.length === 1 && /[^\p{L}\p{N}]/u.test(token)) return token;
          unknown.push(token);
          return "";
        })
        .join(""),
    );
  if (unknown.length > 0) {
    return { output: "", error: { message: `Not a NATO alphabet word: ${Array.from(new Set(unknown)).join(", ")}` } };
  }
  return { output: decoded.join(" "), error: null };
}
