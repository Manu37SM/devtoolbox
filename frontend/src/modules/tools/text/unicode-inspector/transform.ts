import type { TransformResult } from "@/lib/tool-transform";
import type { UnicodeInspectorOptions } from "./schema";

const NAMES: Record<number, string> = {
  0x00: "NULL", 0x07: "BELL", 0x08: "BACKSPACE", 0x09: "CHARACTER TABULATION (tab)", 0x0a: "LINE FEED", 0x0b: "LINE TABULATION", 0x0c: "FORM FEED", 0x0d: "CARRIAGE RETURN",
  0x1b: "ESCAPE", 0x20: "SPACE", 0x7f: "DELETE", 0x85: "NEXT LINE", 0xa0: "NO-BREAK SPACE", 0xad: "SOFT HYPHEN",
  0x1680: "OGHAM SPACE MARK", 0x180e: "MONGOLIAN VOWEL SEPARATOR", 0x2000: "EN QUAD", 0x2001: "EM QUAD", 0x2002: "EN SPACE", 0x2003: "EM SPACE", 0x2004: "THREE-PER-EM SPACE",
  0x2005: "FOUR-PER-EM SPACE", 0x2006: "SIX-PER-EM SPACE", 0x2007: "FIGURE SPACE", 0x2008: "PUNCTUATION SPACE", 0x2009: "THIN SPACE", 0x200a: "HAIR SPACE",
  0x200b: "ZERO WIDTH SPACE", 0x200c: "ZERO WIDTH NON-JOINER", 0x200d: "ZERO WIDTH JOINER", 0x200e: "LEFT-TO-RIGHT MARK", 0x200f: "RIGHT-TO-LEFT MARK",
  0x2028: "LINE SEPARATOR", 0x2029: "PARAGRAPH SEPARATOR", 0x202a: "LEFT-TO-RIGHT EMBEDDING", 0x202b: "RIGHT-TO-LEFT EMBEDDING", 0x202c: "POP DIRECTIONAL FORMATTING",
  0x202d: "LEFT-TO-RIGHT OVERRIDE", 0x202e: "RIGHT-TO-LEFT OVERRIDE", 0x202f: "NARROW NO-BREAK SPACE", 0x205f: "MEDIUM MATHEMATICAL SPACE", 0x2060: "WORD JOINER",
  0x2066: "LEFT-TO-RIGHT ISOLATE", 0x2067: "RIGHT-TO-LEFT ISOLATE", 0x2068: "FIRST STRONG ISOLATE", 0x2069: "POP DIRECTIONAL ISOLATE",
  0x3000: "IDEOGRAPHIC SPACE", 0xfe0e: "VARIATION SELECTOR-15 (text)", 0xfe0f: "VARIATION SELECTOR-16 (emoji)", 0xfeff: "ZERO WIDTH NO-BREAK SPACE (BOM)", 0xfffc: "OBJECT REPLACEMENT CHARACTER", 0xfffd: "REPLACEMENT CHARACTER",
};

const CATEGORIES: Array<[string, string]> = [
  ["Lu", "Uppercase letter"], ["Ll", "Lowercase letter"], ["Lt", "Titlecase letter"], ["Lm", "Modifier letter"], ["Lo", "Other letter"],
  ["Mn", "Nonspacing mark"], ["Mc", "Spacing mark"], ["Me", "Enclosing mark"],
  ["Nd", "Decimal digit"], ["Nl", "Letter number"], ["No", "Other number"],
  ["Pc", "Connector punctuation"], ["Pd", "Dash punctuation"], ["Ps", "Open punctuation"], ["Pe", "Close punctuation"], ["Pi", "Initial quote"], ["Pf", "Final quote"], ["Po", "Other punctuation"],
  ["Sm", "Math symbol"], ["Sc", "Currency symbol"], ["Sk", "Modifier symbol"], ["So", "Other symbol"],
  ["Zs", "Space separator"], ["Zl", "Line separator"], ["Zp", "Paragraph separator"],
  ["Cc", "Control"], ["Cf", "Format"], ["Cs", "Surrogate"], ["Co", "Private use"],
];
const CAT_RES = CATEGORIES.map(([c, label]) => [c, label, new RegExp(`^\\p{${c}}$`, "u")] as const);

export function categoryOf(ch: string): { code: string; label: string } {
  for (const [code, label, re] of CAT_RES) if (re.test(ch)) return { code, label };
  return { code: "Cn", label: "Unassigned" };
}

export function utf8Bytes(cp: number): string {
  return Array.from(new TextEncoder().encode(String.fromCodePoint(cp)), (b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

export function isInvisible(ch: string, cp: number): boolean {
  if (cp === 0x20 || cp === 0x0a || cp === 0x09) return false;
  const cat = categoryOf(ch).code;
  return cat === "Cc" || cat === "Cf" || cat === "Zs" || cat === "Zl" || cat === "Zp" || cp === 0x180e || cat === "Mn" && (cp === 0xfe0e || cp === 0xfe0f);
}

const hex = (cp: number, pad = 4) => cp.toString(16).toUpperCase().padStart(pad, "0");
const printable = (ch: string, cp: number) => (cp < 0x20 || cp === 0x7f || isInvisible(ch, cp) ? "·" : ch);

export function escapeForms(cp: number): string {
  const s = String.fromCodePoint(cp);
  const units = Array.from({ length: s.length }, (_, i) => "\\u" + hex(s.charCodeAt(i))).join("");
  return [
    `U+${hex(cp)}`,
    `JS/JSON ${cp > 0xffff ? units : "\\u" + hex(cp)}${cp > 0xffff ? `  or  \\u{${hex(cp, 1)}}` : ""}`,
    `Java ${units || "\\u" + hex(cp)}`,
    `Python ${cp > 0xffff ? "\\U" + hex(cp, 8) : "\\u" + hex(cp)}`,
    `HTML &#x${hex(cp, 1)}; / &#${cp};`,
    `CSS \\${hex(cp, 1)}`,
  ].join(" | ");
}

export function inspectUnicode(input: string, options: UnicodeInspectorOptions): TransformResult {
  if (!input) return { output: "", error: null };
  const chars = Array.from(input);
  const cps = chars.map((c) => c.codePointAt(0)!);
  if (options.mode === "escapes") {
    return { output: chars.map((c, i) => `${printable(c, cps[i]!)}  ${escapeForms(cps[i]!)}`).join("\n"), error: null };
  }
  if (options.mode === "invisible") {
    const hits: string[] = [];
    let line = 1, col = 1;
    chars.forEach((c, i) => {
      const cp = cps[i]!;
      if (isInvisible(c, cp) || cp === 0x09) hits.push(`line ${line}, col ${col}: U+${hex(cp)} ${NAMES[cp] ?? categoryOf(c).label}`);
      if (cp === 0x0a) { line++; col = 1; } else col++;
    });
    const trailing = input.split("\n").map((l, i) => (/[ \t]+$/.test(l) ? i + 1 : 0)).filter(Boolean);
    const lines = [hits.length ? `${hits.length} invisible / unusual whitespace character(s):` : "No invisible or non-standard whitespace characters found.", ...hits.slice(0, 500)];
    if (trailing.length) lines.push("", `Trailing whitespace on line(s): ${trailing.slice(0, 50).join(", ")}${trailing.length > 50 ? "…" : ""}`);
    const rendered = chars.map((c, i) => (cps[i] === 0x0a ? "\n" : cps[i] === 0x09 ? "→" : cps[i] === 0x20 ? " " : isInvisible(c, cps[i]!) ? `⟦${hex(cps[i]!)}⟧` : c)).join("");
    return { output: `${lines.join("\n")}\n\n--- visualised ---\n${rendered}`, error: null };
  }
  const header = "Char  Code point  UTF-8        UTF-16       Category  Name / description";
  const rows = chars.slice(0, 2000).map((c, i) => {
    const cp = cps[i]!;
    const u16 = Array.from({ length: c.length }, (_, k) => hex(c.charCodeAt(k))).join(" ");
    const cat = categoryOf(c);
    return `${printable(c, cp).padEnd(4)}  ${("U+" + hex(cp)).padEnd(10)}  ${utf8Bytes(cp).padEnd(11)}  ${u16.padEnd(11)}  ${cat.code.padEnd(8)}  ${NAMES[cp] ?? cat.label}`;
  });
  const bytes = new TextEncoder().encode(input).length;
  const summary = `${chars.length} code point${chars.length === 1 ? "" : "s"}, ${input.length} UTF-16 unit${input.length === 1 ? "" : "s"}, ${bytes} UTF-8 byte${bytes === 1 ? "" : "s"}${chars.length > 2000 ? " (first 2000 shown)" : ""}`;
  return { output: `${summary}\n\n${header}\n${rows.join("\n")}`, error: null };
}
