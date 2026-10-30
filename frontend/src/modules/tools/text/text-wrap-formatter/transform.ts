import type { TransformResult } from "@/lib/tool-transform";
import type { TextWrapFormatterOptions } from "./schema";

const PREFIX_RE = /^(\s*(?:\/\/\/?|#+|--|;+|%+|\*|>+))(?: |$)/;

const len = (s: string) => Array.from(s).length;

/** The prefix every non-blank line starts with, if there is one. */
function sharedPrefix(lines: string[]): string {
  let found = "";
  for (const l of lines) {
    if (!l.trim()) continue;
    const m = PREFIX_RE.exec(l);
    if (!m) return "";
    if (!found) found = m[1] ?? "";
    else if (m[1] !== found) return "";
  }
  return found;
}

function breakWord(word: string, width: number): string[] {
  const chars = Array.from(word);
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += width) parts.push(chars.slice(i, i + width).join(""));
  return parts;
}

function justifyLine(words: string[], width: number): string {
  if (words.length < 2) return words.join("");
  const total = words.reduce((n, w) => n + len(w), 0);
  const gaps = words.length - 1;
  const spaces = width - total;
  if (spaces < gaps) return words.join(" ");
  const base = Math.floor(spaces / gaps);
  let extra = spaces % gaps;
  let line = "";
  words.forEach((w, i) => {
    line += w;
    if (i < gaps) line += " ".repeat(base + (extra-- > 0 ? 1 : 0));
  });
  return line;
}

function wrapParagraph(text: string, o: Required<TextWrapFormatterOptions>, avail: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[][] = [];
  let cur: string[] = [];
  let curLen = 0;
  const indentFor = (first: boolean) => (first ? o.firstIndent : o.hangingIndent);
  const room = () => Math.max(1, avail - indentFor(lines.length === 0));

  const push = () => {
    if (cur.length) lines.push(cur);
    cur = [];
    curLen = 0;
  };
  for (const raw of words) {
    const pieces = o.breakLongWords && len(raw) > room() ? breakWord(raw, room()) : [raw];
    for (const w of pieces) {
      const add = len(w) + (cur.length ? 1 : 0);
      if (cur.length && curLen + add > room()) push();
      curLen += len(w) + (cur.length ? 1 : 0);
      cur.push(w);
    }
  }
  push();
  return lines.map((ws, i) => {
    const ind = indentFor(i === 0);
    const inner = avail - ind;
    const isLast = i === lines.length - 1;
    let body = ws.join(" ");
    if (o.align === "justify" && !isLast) body = justifyLine(ws, inner);
    else if (o.align === "right") body = " ".repeat(Math.max(0, inner - len(body))) + body;
    else if (o.align === "center") body = " ".repeat(Math.max(0, Math.floor((inner - len(body)) / 2))) + body;
    return " ".repeat(ind) + body;
  });
}

export function formatTextWrap(input: string, options: Partial<TextWrapFormatterOptions>): TransformResult {
  const o: Required<TextWrapFormatterOptions> = {
    mode: options.mode ?? "wrap",
    width: options.width ?? 80,
    align: options.align ?? "left",
    firstIndent: options.firstIndent ?? 0,
    hangingIndent: options.hangingIndent ?? 0,
    prefix: options.prefix ?? "",
    detectPrefix: options.detectPrefix ?? true,
    joinLines: options.joinLines ?? true,
    breakLongWords: options.breakLongWords ?? false,
  };
  if (!input.trim()) return { output: "", error: null };
  const eol = input.includes("\r\n") ? "\r\n" : "\n";
  let lines = input.replace(/\r\n/g, "\n").split("\n");

  let prefix = o.prefix;
  if (o.detectPrefix) {
    const found = sharedPrefix(lines);
    if (found) {
      lines = lines.map((l) => (l.trim() ? l.slice(found.length).replace(/^ /, "") : ""));
      if (!prefix) prefix = found + " ";
    }
  }
  const blankPrefix = prefix.replace(/\s+$/, "");
  const avail = Math.max(1, o.width - len(prefix));
  if (o.mode === "wrap" && o.width - len(prefix) < 5) {
    return { output: "", error: { message: "The prefix leaves less than 5 columns for text. Increase the width." } };
  }

  // Paragraphs are separated by blank lines.
  const paras: string[][] = [[]];
  for (const l of lines) {
    if (!l.trim()) {
      if (paras[paras.length - 1]!.length) paras.push([]);
    } else paras[paras.length - 1]!.push(l);
  }
  if (!paras[paras.length - 1]!.length) paras.pop();

  const out: string[] = [];
  paras.forEach((p, idx) => {
    if (idx > 0) out.push(blankPrefix);
    const groups = o.joinLines || o.mode === "unwrap" ? [p.join(" ")] : p;
    for (const g of groups) {
      if (o.mode === "unwrap") out.push(prefix + " ".repeat(o.firstIndent) + g.trim().replace(/\s+/g, " "));
      else for (const l of wrapParagraph(g, o, avail)) out.push(prefix + l);
    }
  });
  return { output: out.map((l) => l.replace(/[ \t]+$/, (m) => (l.trim() === "" ? "" : m))).join(eol), error: null };
}
