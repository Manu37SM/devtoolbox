import type { TransformResult } from "@/lib/tool-transform";
import type { BrailleConverterOptions } from "./schema";

type Opts = BrailleConverterOptions;

/** North American Braille ASCII: index = dot bits (dot1=1 … dot6=32), char = ASCII glyph. */
export const BRAILLE_ASCII = " A1B'K2L@CIF/MSP\"E3H9O6R^DJG>NTQ,*5<-U8V.%[$+X!&;:4\\0Z7(_?W]#Y)=";

const BASE = 0x2800;
const LETTER_BITS: Record<string, number> = {};
const BITS_LETTER = new Map<number, string>();
for (const ch of "abcdefghijklmnopqrstuvwxyz") {
  const bits = BRAILLE_ASCII.indexOf(ch.toUpperCase());
  LETTER_BITS[ch] = bits;
  BITS_LETTER.set(bits, ch);
}
const DIGIT_FOR: Record<string, string> = { "1": "a", "2": "b", "3": "c", "4": "d", "5": "e", "6": "f", "7": "g", "8": "h", "9": "i", "0": "j" };
const LETTER_FOR_DIGIT: Record<string, string> = Object.fromEntries(Object.entries(DIGIT_FOR).map(([d, l]) => [l, d]));

const cell = (bits: number) => String.fromCodePoint(BASE + bits);
const dotsToBits = (...d: number[]) => d.reduce((a, n) => a | (1 << (n - 1)), 0);

const CAPITAL = cell(dotsToBits(6));
const NUMERIC = cell(dotsToBits(3, 4, 5, 6));
const LETTER_IND = cell(dotsToBits(5, 6));

/** UEB grade-1 punctuation (cells given as dot lists). */
const PUNCT: Record<string, number[][]> = {
  ".": [[2, 5, 6]], ",": [[2]], ";": [[2, 3]], ":": [[2, 5]], "!": [[2, 3, 5]], "?": [[2, 3, 6]],
  "'": [[3]], "-": [[3, 6]], "/": [[4, 5, 6], [3, 4]], "@": [[4], [1]],
  "(": [[5], [1, 2, 6]], ")": [[5], [3, 4, 5]],
  "[": [[4, 6], [1, 2, 6]], "]": [[4, 6], [3, 4, 5]],
  "*": [[5], [3, 5]], "&": [[4], [1, 2, 3, 4, 6]], "#": [[4, 6], [3, 4, 5, 6]],
  "%": [[4, 6], [3, 5, 6]], "+": [[5], [2, 3, 5]], "=": [[5], [2, 3, 5, 6]], "<": [[4], [1, 2, 6]], ">": [[4], [3, 4, 5]],
  "_": [[4, 5, 6], [3, 6]],
};
const PUNCT_CELLS = new Map<string, string>();
for (const [ch, cells] of Object.entries(PUNCT)) PUNCT_CELLS.set(ch, cells.map((d) => cell(dotsToBits(...d))).join(""));
const PUNCT_DECODE = new Map<string, string>();
for (const [ch, c] of PUNCT_CELLS) PUNCT_DECODE.set(c, ch);
const OPEN_QUOTE = cell(dotsToBits(2, 3, 6)); // same cell as "?" – told apart by what follows
const CLOSE_QUOTE = cell(dotsToBits(3, 5, 6));

export function encodeBraille(text: string): { cells: string; notes: string[] } {
  const notes = new Set<string>();
  const out: string[] = [];
  const chars = Array.from(text.normalize("NFC"));
  let inNumber = false;
  let quoteOpen: boolean = false;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (ch === "\n" || ch === "\r" || ch === "\t") {
      out.push(ch);
      inNumber = false;
      continue;
    }
    if (ch === " ") {
      out.push(cell(0));
      inNumber = false;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      if (!inNumber) out.push(NUMERIC);
      inNumber = true;
      out.push(cell(LETTER_BITS[DIGIT_FOR[ch]!]!));
      continue;
    }
    if (inNumber && (ch === "." || ch === ",") && /[0-9]/.test(chars[i + 1] ?? "")) {
      out.push(ch === "." ? cell(dotsToBits(4, 6)) : cell(dotsToBits(2))); // numeric period / comma keep the number going
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const lower = ch.toLowerCase();
      const afterNumberPunct = i >= 2 && (chars[i - 1] === "," || chars[i - 1] === ".") && /[0-9]/.test(chars[i - 2]!);
      if ((inNumber || afterNumberPunct) && "abcdefghij".includes(lower)) out.push(LETTER_IND); // grade-1 symbol so a–j is not read as a digit
      inNumber = false;
      if (ch !== lower) {
        // run of capitals within one word?
        let j = i;
        while (j < chars.length && /[A-Z]/.test(chars[j]!)) j++;
        const prevCap = i > 0 && /[A-Z]/.test(chars[i - 1]!);
        let k = i;
        while (k > 0 && /[A-Z]/.test(chars[k - 1]!)) k--;
        const capSingle = prevCap && j - k >= 2 && /[a-z]/.test(chars[j] ?? "");
        const run = j - i;
        const lowerFollows = /[a-z]/.test(chars[j] ?? "");
        if (!prevCap) out.push(run >= 2 && !lowerFollows ? CAPITAL + CAPITAL : CAPITAL);
        else if (capSingle) out.push(CAPITAL);
      }
      out.push(cell(LETTER_BITS[lower]!));
      continue;
    }
    inNumber = false;
    if (ch === '"' || ch === "“" || ch === "”") {
      const open: boolean = ch === "“" || (ch === '"' && !quoteOpen);
      out.push(open ? OPEN_QUOTE : CLOSE_QUOTE);
      quoteOpen = open;
      continue;
    }
    if (ch === "’") {
      out.push(PUNCT_CELLS.get("'")!);
      continue;
    }
    const p = PUNCT_CELLS.get(ch);
    if (p) {
      out.push(p);
      continue;
    }
    if (ch.codePointAt(0)! >= BASE && ch.codePointAt(0)! < BASE + 256) {
      out.push(ch); // already braille
      continue;
    }
    notes.add(`"${ch}" has no Grade 1 translation here and was kept as-is`);
    out.push(ch);
  }
  return { cells: out.join(""), notes: [...notes] };
}

export function decodeBraille(cells: string): { text: string; notes: string[] } {
  const notes = new Set<string>();
  const chars = Array.from(cells);
  let out = "";
  let numeric = false;
  let capNext = false;
  let capWord = false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    const cp = c.codePointAt(0)!;
    // a capitals word ends at the first cell that is not a letter (or the capital indicator itself)
    if (capWord && c !== CAPITAL && !(cp >= BASE && cp < BASE + 256 && BITS_LETTER.has(cp - BASE))) capWord = false;
    if (cp < BASE || cp >= BASE + 256) {
      if (/\s/.test(c)) {
        numeric = false;
        capWord = false;
      }
      out += c;
      continue;
    }
    const bits = cp - BASE;
    if (bits === 0) {
      out += " ";
      numeric = false;
      capWord = false;
      continue;
    }
    if (c === NUMERIC) {
      numeric = true;
      continue;
    }
    if (c === LETTER_IND) {
      numeric = false;
      continue;
    }
    if (c === CAPITAL) {
      numeric = false;
      if (chars[i + 1] === CAPITAL) {
        capWord = true;
        i++;
      } else capNext = true;
      continue;
    }
    // two-cell punctuation first
    if (c === OPEN_QUOTE || c === CLOSE_QUOTE) {
      const next = chars[i + 1];
      const nextIsWord = next !== undefined && next.codePointAt(0)! > BASE && !/\s/.test(next) && (BITS_LETTER.has(next.codePointAt(0)! - BASE) || next === CAPITAL || next === NUMERIC);
      out += c === CLOSE_QUOTE ? "”" : nextIsWord ? "“" : "?";
      numeric = false;
      continue;
    }
    const two = c + (chars[i + 1] ?? "");
    const p2 = PUNCT_DECODE.get(two);
    if (p2 && chars[i + 1] !== undefined) {
      out += p2;
      i++;
      numeric = false;
      continue;
    }
    if (numeric && (bits === dotsToBits(4, 6) || bits === dotsToBits(2))) {
      const nx = chars[i + 1]?.codePointAt(0);
      const nl = nx !== undefined && nx >= BASE && nx < BASE + 256 ? BITS_LETTER.get(nx - BASE) : undefined;
      if (nl && LETTER_FOR_DIGIT[nl]) {
        out += bits === dotsToBits(4, 6) ? "." : ",";
        continue;
      }
      numeric = false; // a comma with no digit after it ends the number
    }
    if (numeric) {
      const letter = BITS_LETTER.get(bits);
      if (letter && LETTER_FOR_DIGIT[letter]) {
        out += LETTER_FOR_DIGIT[letter];
        continue;
      }
      numeric = false;
    }
    const letter = BITS_LETTER.get(bits);
    if (letter) {
      out += capNext || capWord ? letter.toUpperCase() : letter;
      capNext = false;
      continue;
    }
    const p1 = PUNCT_DECODE.get(c);
    if (p1) {
      out += p1;
      continue;
    }
    notes.add(`Cell ${c} (dots ${dotList(bits)}) is not a Grade 1 letter, digit or punctuation mark`);
    out += c;
  }
  return { text: out, notes: [...notes] };
}

export const dotList = (bits: number): string => {
  const d: number[] = [];
  for (let i = 0; i < 8; i++) if (bits & (1 << i)) d.push(i + 1);
  return d.length ? d.join("") : "blank";
};

export const unicodeToAscii = (s: string): string =>
  Array.from(s).map((c) => {
    const cp = c.codePointAt(0)!;
    return cp >= BASE && cp < BASE + 64 ? BRAILLE_ASCII[cp - BASE]! : c;
  }).join("");

export const asciiToUnicode = (s: string): string =>
  Array.from(s).map((c) => {
    if (c === "\n" || c === "\r" || c === "\t") return c;
    const idx = BRAILLE_ASCII.indexOf(c.toUpperCase());
    return idx >= 0 ? cell(idx) : c;
  }).join("");

function dotTable(uni: string): string {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const c of Array.from(uni)) {
    const cp = c.codePointAt(0)!;
    if (cp < BASE || cp >= BASE + 256 || cp === BASE || seen.has(c)) continue;
    seen.add(c);
    rows.push(`${c}  dots ${dotList(cp - BASE).padEnd(7)} U+${cp.toString(16).toUpperCase()}${cp < BASE + 64 ? `  ascii ${BRAILLE_ASCII[cp - BASE]}` : ""}`);
  }
  return rows.join("\n");
}

export function brailleConverter(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = { mode: options.mode ?? "encode", cells: options.cells ?? "unicode", dots: options.dots ?? false };
  if (input === "") return { output: "", error: null };
  try {
    if (o.mode === "encode") {
      const { cells, notes } = encodeBraille(input);
      let out = o.cells === "ascii" ? unicodeToAscii(cells) : cells;
      if (o.dots) out += `\n\n${dotTable(cells)}`;
      if (notes.length) out += `\n\nNotes:\n${notes.map((n) => `- ${n}`).join("\n")}`;
      return { output: out, error: null };
    }
    const uni = o.cells === "ascii" ? asciiToUnicode(input) : input;
    const { text, notes } = decodeBraille(uni);
    let out = text;
    if (o.dots) out += `\n\n${dotTable(uni)}`;
    if (notes.length) out += `\n\nNotes:\n${notes.map((n) => `- ${n}`).join("\n")}`;
    return { output: out, error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
