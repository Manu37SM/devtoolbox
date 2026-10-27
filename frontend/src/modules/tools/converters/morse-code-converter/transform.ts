import type { TransformResult } from "@/lib/tool-transform";
import type { MorseCodeOptions } from "./schema";

const MORSE_TABLE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..",
  J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
  S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--", "/": "-..-.",
  "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-",
  "+": ".-.-.", "-": "-....-", _: "..--.-", '"': ".-..-.", $: "...-..-", "@": ".--.-.",
};

const REVERSE_TABLE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([char, code]) => [code, char]),
);

export function textToMorse(input: string): TransformResult {
  const words = input.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const unsupported = new Set<string>();
  const encodedWords = words.map((word) =>
    Array.from(word)
      .map((ch) => {
        const code = MORSE_TABLE[ch];
        if (code === undefined) unsupported.add(ch);
        return code ?? "";
      })
      .join(" "),
  );
  if (unsupported.size > 0) {
    return {
      output: "",
      error: { message: `No Morse code for: ${Array.from(unsupported).join(" ")}` },
    };
  }
  return { output: encodedWords.join(" / "), error: null };
}

export function morseToText(input: string): TransformResult {
  // Normalise typographic dots/dashes people paste from other sources.
  const normalised = input.trim().replace(/[·•]/g, ".").replace(/[–−—]/g, "-");
  if (normalised.length === 0) return { output: "", error: null };

  const words = normalised.split(/\s*[/|]\s*|\s{3,}|\n+/).filter((w) => w.trim().length > 0);
  const invalid: string[] = [];
  const decoded = words.map((word) =>
    word
      .trim()
      .split(/\s+/)
      .map((code) => {
        if (!/^[.-]+$/.test(code)) {
          invalid.push(code);
          return "";
        }
        const ch = REVERSE_TABLE[code];
        if (ch === undefined) invalid.push(code);
        return ch ?? "";
      })
      .join(""),
  );
  if (invalid.length > 0) {
    return {
      output: "",
      error: { message: `Unrecognised Morse sequence: ${Array.from(new Set(invalid)).join(" ")}` },
    };
  }
  return { output: decoded.join(" "), error: null };
}

export function convertMorse(input: string, options: MorseCodeOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  return options.mode === "text-to-morse" ? textToMorse(input) : morseToText(input);
}
