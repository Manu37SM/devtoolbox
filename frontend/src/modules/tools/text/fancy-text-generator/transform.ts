import type { TransformResult } from "@/lib/tool-transform";
import type { FancyTextGeneratorOptions } from "./schema";

type Style = Exclude<FancyTextGeneratorOptions["style"], "all">;

interface Block { upper: number; lower: number; digit?: number; holes?: Record<string, number> }

// Mathematical Alphanumeric Symbols; "holes" are letters that live in the Letterlike Symbols block instead.
const BLOCKS: Partial<Record<Style, Block>> = {
  bold: { upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
  italic: { upper: 0x1d434, lower: 0x1d44e, holes: { h: 0x210e } },
  boldItalic: { upper: 0x1d468, lower: 0x1d482 },
  script: { upper: 0x1d49c, lower: 0x1d4b6, holes: { B: 0x212c, E: 0x2130, F: 0x2131, H: 0x210b, I: 0x2110, L: 0x2112, M: 0x2133, R: 0x211b, e: 0x212f, g: 0x210a, o: 0x2134 } },
  boldScript: { upper: 0x1d4d0, lower: 0x1d4ea },
  fraktur: { upper: 0x1d504, lower: 0x1d51e, holes: { C: 0x212d, H: 0x210c, I: 0x2111, R: 0x211c, Z: 0x2128 } },
  boldFraktur: { upper: 0x1d56c, lower: 0x1d586 },
  doubleStruck: { upper: 0x1d538, lower: 0x1d552, digit: 0x1d7d8, holes: { C: 0x2102, H: 0x210d, N: 0x2115, P: 0x2119, Q: 0x211a, R: 0x211d, Z: 0x2124 } },
  sans: { upper: 0x1d5a0, lower: 0x1d5ba, digit: 0x1d7e2 },
  sansBold: { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  sansItalic: { upper: 0x1d608, lower: 0x1d622 },
  monospace: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
};

const SMALL_CAPS: Record<string, string> = { a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ" };
const FLIP: Record<string, string> = { a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ", j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ", s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z", A: "∀", B: "𐐒", C: "Ɔ", D: "◖", E: "Ǝ", F: "Ⅎ", G: "⅁", H: "H", I: "I", J: "ſ", K: "⋊", L: "⅂", M: "W", N: "N", O: "O", P: "Ԁ", Q: "Ό", R: "ᴚ", S: "S", T: "⊥", U: "∩", V: "Λ", W: "M", X: "X", Y: "⅄", Z: "Z", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ", "6": "9", "7": "ㄥ", "8": "8", "9": "6", "0": "0", ".": "˙", ",": "'", "'": ",", '"': "„", "!": "¡", "?": "¿", "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "&": "⅋", _: "‾" };

export function mapChar(ch: string, style: Style): string {
  const b = BLOCKS[style];
  if (b) {
    if (b.holes?.[ch]) return String.fromCodePoint(b.holes[ch]!);
    if (ch >= "A" && ch <= "Z") return String.fromCodePoint(b.upper + ch.charCodeAt(0) - 65);
    if (ch >= "a" && ch <= "z") return String.fromCodePoint(b.lower + ch.charCodeAt(0) - 97);
    if (b.digit !== undefined && ch >= "0" && ch <= "9") return String.fromCodePoint(b.digit + ch.charCodeAt(0) - 48);
    return ch;
  }
  switch (style) {
    case "circled":
      if (ch >= "A" && ch <= "Z") return String.fromCodePoint(0x24b6 + ch.charCodeAt(0) - 65);
      if (ch >= "a" && ch <= "z") return String.fromCodePoint(0x24d0 + ch.charCodeAt(0) - 97);
      if (ch >= "1" && ch <= "9") return String.fromCodePoint(0x2460 + ch.charCodeAt(0) - 49);
      return ch === "0" ? "⓪" : ch;
    case "fullwidth":
      if (ch === " ") return "　";
      return ch >= "!" && ch <= "~" ? String.fromCodePoint(ch.charCodeAt(0) + 0xfee0) : ch;
    case "smallCaps": return SMALL_CAPS[ch.toLowerCase()] ?? ch;
    default: return ch;
  }
}

export function stylize(text: string, style: Style): string {
  if (style === "upsideDown") return Array.from(text).map((c) => FLIP[c] ?? FLIP[c.toLowerCase()] ?? c).reverse().join("");
  if (style === "strikethrough") return Array.from(text).map((c) => (c.trim() ? c + "̶" : c)).join("");
  if (style === "underline") return Array.from(text).map((c) => (c.trim() ? c + "̲" : c)).join("");
  return Array.from(text).map((c) => mapChar(c, style)).join("");
}

export const STYLE_LABELS: Record<Style, string> = {
  bold: "Bold", italic: "Italic", boldItalic: "Bold italic", script: "Script", boldScript: "Bold script", fraktur: "Fraktur", boldFraktur: "Bold fraktur",
  doubleStruck: "Double-struck", sans: "Sans-serif", sansBold: "Sans bold", sansItalic: "Sans italic", monospace: "Monospace", circled: "Circled",
  fullwidth: "Fullwidth", smallCaps: "Small caps", upsideDown: "Upside down", strikethrough: "Strikethrough", underline: "Underline",
};

export function generateFancyText(input: string, options: FancyTextGeneratorOptions): TransformResult {
  if (!input) return { output: "", error: null };
  const styles = (options.style === "all" ? Object.keys(STYLE_LABELS) : [options.style]) as Style[];
  if (options.style !== "all") return { output: stylize(input, options.style), error: null };
  return { output: styles.map((s) => `${STYLE_LABELS[s].padEnd(14)} ${stylize(input, s)}`).join("\n"), error: null };
}
