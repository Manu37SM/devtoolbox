import type { TransformResult } from "@/lib/tool-transform";
import type { StringEscapeOptions } from "./schema";

const SIMPLE: Record<string, string> = { "\\": "\\\\", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\b": "\\b", "\f": "\\f" };
const hex4 = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");

function escapeCode(s: string, quote: '"' | "'" | "both", js: boolean): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (SIMPLE[ch] !== undefined) out += SIMPLE[ch];
    else if (ch === '"' && quote !== "'") out += '\\"';
    else if (ch === "'" && quote !== '"') out += "\\'";
    else if (js && ch === "\v") out += "\\v";
    else if (js && ch === "\0") out += "\\0";
    else {
      const code = ch.charCodeAt(0);
      out += code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029 || (!js && code > 0x7e) ? `\\u${hex4(code)}` : ch;
    }
  }
  return out;
}

const UNESCAPE = /\\(?:u\{([0-9a-fA-F]{1,6})\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([\s\S]))/g;
const SINGLE: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", "0": "\0" };

function unescapeCode(s: string): string {
  return s.replace(UNESCAPE, (_m, cp, u4, x2, ch: string) => {
    if (cp !== undefined) {
      const n = parseInt(cp, 16);
      if (n > 0x10ffff) throw new Error(`\\u{${cp}} is beyond U+10FFFF.`);
      return String.fromCodePoint(n);
    }
    if (u4 !== undefined) return String.fromCharCode(parseInt(u4, 16));
    if (x2 !== undefined) return String.fromCharCode(parseInt(x2, 16));
    if (ch === "\n") return ""; // line continuation
    return SINGLE[ch] ?? ch;
  });
}

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\\/-]/g;

export function convertStringEscape(input: string, options: StringEscapeOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };
  const escaping = options.mode === "escape";
  try {
    switch (options.language) {
      case "json":
        return escaping
          ? { output: JSON.stringify(input).slice(1, -1), error: null }
          : { output: JSON.parse(`"${input.replace(/\r?\n/g, "\\n")}"`) as string, error: null };
      case "javascript":
        return { output: escaping ? escapeCode(input, "both", true) : unescapeCode(input), error: null };
      case "java":
        return { output: escaping ? escapeCode(input, '"', false) : unescapeCode(input), error: null };
      case "sql":
        return { output: escaping ? input.replace(/'/g, "''") : input.replace(/''/g, "'"), error: null };
      case "regex":
        return { output: escaping ? input.replace(REGEX_SPECIALS, "\\$&") : input.replace(/\\([.*+?^${}()|[\]\\/-])/g, "$1"), error: null };
      case "csv": {
        if (escaping) {
          const needsQuotes = /[",\r\n]/.test(input) || /^\s|\s$/.test(input);
          const body = input.replace(/"/g, '""');
          return { output: needsQuotes ? `"${body}"` : body, error: null };
        }
        const m = /^"([\s\S]*)"$/.exec(input.trim());
        return { output: (m ? m[1]! : input).replace(/""/g, '"'), error: null };
      }
      case "shell":
        if (escaping) return { output: `'${input.replace(/'/g, `'\\''`)}'`, error: null };
        return { output: input.trim().replace(/^'([\s\S]*)'$/, "$1").replace(/'\\''/g, "'"), error: null };
    }
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not process input." } };
  }
}
