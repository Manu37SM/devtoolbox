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

/** Non-English letters (ITU and common extensions); É is in ITU-R M.1677. */
const EXTENDED_TABLE: Record<string, string> = {
  À: ".--.-", Å: ".--.-", Ä: ".-.-", Æ: ".-.-", Á: ".--.-", Ç: "-.-..", Ð: "..--.", É: "..-..", È: ".-..-",
  Ñ: "--.--", Ö: "---.", Ø: "---.", Ü: "..--", Þ: ".--..", CH: "----",
};

/** Prosigns are run-together letters with no letter gap. */
const PROSIGNS: Record<string, string> = {
  SOS: "...---...", AR: ".-.-.", SK: "...-.-", BT: "-...-", KN: "-.--.", AS: ".-...", CT: "-.-.-", HH: "........",
};

const REVERSE_TABLE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([char, code]) => [code, char]),
);
const REVERSE_EXTENDED: Record<string, string> = {
  ...Object.fromEntries(Object.entries(EXTENDED_TABLE).map(([c, code]) => [code, c])),
  // Ambiguous codes decode to the most common letter.
  ".--.-": "À", ".-.-": "Ä", "---.": "Ö", "........": "<HH>", "...---...": "<SOS>", "...-.-": "<SK>",
};

type Opts = Partial<MorseCodeOptions>;

const SEP: Record<MorseCodeOptions["wordSeparator"], string> = { slash: " / ", pipe: " | ", spaces: "   ", newline: "\n" };

function render(code: string, symbols: MorseCodeOptions["symbols"]): string {
  if (symbols === "unicode") return code.replace(/\./g, "·").replace(/-/g, "−");
  if (symbols === "ditdah") return [...code].map((c) => (c === "." ? "dit" : "dah")).join("-");
  return code;
}

export function textToMorse(input: string, o: Opts = {}): TransformResult {
  const words = input.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const unsupported = new Set<string>();
  const mode = o.unsupported ?? "error";
  const encodedWords = words.map((word) => {
    const codes: string[] = [];
    for (let i = 0; i < word.length; ) {
      if (o.extended) {
        const pro = /^<([A-Z]+)>/.exec(word.slice(i));
        if (pro && PROSIGNS[pro[1]!]) {
          codes.push(PROSIGNS[pro[1]!]!);
          i += pro[0].length;
          continue;
        }
      }
      const ch = String.fromCodePoint(word.codePointAt(i)!);
      i += ch.length;
      const code = MORSE_TABLE[ch] ?? (o.extended ? EXTENDED_TABLE[ch] : undefined);
      if (code !== undefined) codes.push(code);
      else {
        unsupported.add(ch);
        if (mode === "question") codes.push(MORSE_TABLE["?"]!);
      }
    }
    return codes.map((c) => render(c, o.symbols ?? "ascii")).join(o.symbols === "ditdah" ? "  " : " ");
  });
  if (unsupported.size > 0 && mode === "error") {
    return {
      output: "",
      error: { message: `No Morse code for: ${Array.from(unsupported).join(" ")}` },
    };
  }
  return { output: encodedWords.filter(Boolean).join(SEP[o.wordSeparator ?? "slash"]), error: null };
}

export function morseToText(input: string, o: Opts = {}): TransformResult {
  // Normalise typographic dots/dashes and dit/dah spellings people paste from other sources.
  const normalised = input
    .trim()
    .replace(/\bdit\b-?|\bdi-/gi, ".")
    .replace(/\bdah\b-?/gi, "-")
    .replace(/[·•∙⋅]/g, ".")
    .replace(/[–−—_]/g, "-");
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
          return o.unsupported === "question" ? "?" : "";
        }
        const ch = REVERSE_TABLE[code] ?? (o.extended ? REVERSE_EXTENDED[code] : undefined);
        if (ch === undefined) {
          invalid.push(code);
          return o.unsupported === "question" ? "?" : "";
        }
        return ch;
      })
      .join(""),
  );
  if (invalid.length > 0 && (o.unsupported ?? "error") === "error") {
    return {
      output: "",
      error: { message: `Unrecognised Morse sequence: ${Array.from(new Set(invalid)).join(" ")}` },
    };
  }
  return { output: decoded.join(" "), error: null };
}

export function convertMorse(input: string, options: Opts & Pick<MorseCodeOptions, "mode">): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  return options.mode === "text-to-morse" ? textToMorse(input, options) : morseToText(input, options);
}

/** One tone (on) or silence (off) segment of the audio, in milliseconds. */
export interface MorseSegment {
  on: boolean;
  ms: number;
}

/**
 * Timing for playing Morse text (dots, dashes, " " between letters, " / " between words).
 * PARIS standard: one dot = 1200 / wpm ms. With Farnsworth spacing, characters are sent at
 * `wpm` but the gaps between characters and words are stretched to reach `farnsworthWpm`
 * overall (ARRL formula).
 */
export function morseTimings(morse: string, wpm = 20, farnsworthWpm = wpm): MorseSegment[] {
  const dot = 1200 / wpm;
  let charGap = 3 * dot;
  let wordGap = 7 * dot;
  if (farnsworthWpm < wpm) {
    const ta = ((60 * wpm - 37.2 * farnsworthWpm) / (wpm * farnsworthWpm)) * 1000;
    charGap = (3 * ta) / 19;
    wordGap = (7 * ta) / 19;
  }
  const out: MorseSegment[] = [];
  const words = morse.trim().split(/\s*[/|]\s*|\s{3,}|\n+/).filter(Boolean);
  words.forEach((word, wi) => {
    if (wi > 0) out.push({ on: false, ms: wordGap });
    word
      .trim()
      .split(/\s+/)
      .forEach((letter, li) => {
        if (li > 0) out.push({ on: false, ms: charGap });
        [...letter.replace(/·/g, ".").replace(/−/g, "-")].forEach((s, si) => {
          if (si > 0) out.push({ on: false, ms: dot });
          if (s === "." || s === "-") out.push({ on: true, ms: s === "." ? dot : 3 * dot });
        });
      });
  });
  return out;
}

/** Renders timings as a 16-bit mono WAV with 5 ms ramps to avoid clicks. */
export function morseToWav(segments: MorseSegment[], frequency = 600, sampleRate = 8000): Uint8Array {
  const total = Math.ceil((segments.reduce((s, x) => s + x.ms, 0) / 1000) * sampleRate);
  const data = new Int16Array(total);
  const ramp = Math.floor(0.005 * sampleRate);
  let pos = 0;
  for (const seg of segments) {
    const n = Math.round((seg.ms / 1000) * sampleRate);
    if (seg.on) {
      for (let i = 0; i < n && pos + i < total; i++) {
        const env = Math.min(1, i / ramp, (n - i) / ramp);
        data[pos + i] = Math.round(Math.sin((2 * Math.PI * frequency * i) / sampleRate) * env * 0.6 * 32767);
      }
    }
    pos += n;
  }
  const bytes = new Uint8Array(44 + data.length * 2);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + data.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, data.length * 2, true);
  data.forEach((s, i) => v.setInt16(44 + i * 2, s, true));
  return bytes;
}
