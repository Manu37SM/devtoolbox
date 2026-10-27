import type { TransformResult } from "@/lib/tool-transform";
import type { UnicodeEscapeFormat, UnicodeEscapeOptions } from "./schema";

const hex = (n: number, pad = 0) => n.toString(16).toUpperCase().padStart(pad, "0");

function escapeCodePoint(cp: number, format: UnicodeEscapeFormat): string {
  switch (format) {
    case "js":
      if (cp > 0xffff) {
        const offset = cp - 0x10000;
        const high = 0xd800 + (offset >> 10);
        const low = 0xdc00 + (offset & 0x3ff);
        return `\\u${hex(high, 4)}\\u${hex(low, 4)}`;
      }
      return `\\u${hex(cp, 4)}`;
    case "es6":
      return `\\u{${hex(cp)}}`;
    case "codepoint":
      return `U+${hex(cp, 4)}`;
    case "html-hex":
      return `&#x${hex(cp)};`;
    case "html-dec":
      return `&#${cp};`;
  }
}

export function escapeUnicode(input: string, format: UnicodeEscapeFormat, escapeAscii: boolean): string {
  let out = "";
  for (const ch of input) {
    const cp = ch.codePointAt(0)!;
    out += cp < 0x80 && !escapeAscii ? ch : escapeCodePoint(cp, format);
  }
  return out;
}

// One pass, all supported notations. Order matters: \u{…} must be tried before \uXXXX.
const UNESCAPE_PATTERN =
  /\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|U\+([0-9a-fA-F]{4,6})|&#x([0-9a-fA-F]{1,6});|&#(\d{1,7});/g;

export function unescapeUnicode(input: string): string {
  return input.replace(UNESCAPE_PATTERN, (match, es6, js, latin, cpNotation, htmlHex, htmlDec) => {
    const isHex = es6 ?? js ?? latin ?? cpNotation ?? htmlHex;
    const cp = isHex !== undefined ? parseInt(isHex, 16) : parseInt(htmlDec, 10);
    if (cp > 0x10ffff) {
      throw new Error(`"${match}" is beyond the Unicode range (max U+10FFFF).`);
    }
    // String.fromCodePoint keeps lone surrogates, and adjacent \uD83D\uDE00 escapes
    // concatenate into a valid pair.
    return String.fromCodePoint(cp);
  });
}

export function convertUnicodeEscape(input: string, options: UnicodeEscapeOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };
  try {
    if (options.mode === "escape") {
      return { output: escapeUnicode(input, options.format, options.escapeAscii), error: null };
    }
    return { output: unescapeUnicode(input), error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not unescape input." } };
  }
}
