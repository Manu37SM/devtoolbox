import type { TransformResult } from "@/lib/tool-transform";
import type { GraphqlFormatterOptions } from "./schema";

type Kind = "punct" | "name" | "number" | "string" | "comment";
export interface Token { kind: Kind; text: string; line: number }

class GqlError extends Error {
  constructor(msg: string, public line: number, public column: number) { super(msg); }
}

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0, line = 1, lineStart = 0;
  const err = (m: string): never => { throw new GqlError(`${m} at line ${line}, column ${i - lineStart + 1}`, line, i - lineStart + 1); };
  while (i < src.length) {
    const c = src[i]!;
    if (c === "\n") { line++; i++; lineStart = i; continue; }
    if (/[\s,﻿]/.test(c)) { i++; continue; }
    if (c === "#") { const e = src.indexOf("\n", i); const end = e < 0 ? src.length : e; out.push({ kind: "comment", text: src.slice(i, end).trimEnd(), line }); i = end; continue; }
    if (src.startsWith('"""', i)) {
      const e = src.indexOf('"""', i + 3);
      if (e < 0) err("Unterminated block string");
      const text = src.slice(i, e + 3);
      out.push({ kind: "string", text, line });
      for (const ch of text) if (ch === "\n") { line++; }
      i = e + 3;
      lineStart = src.lastIndexOf("\n", i) + 1;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') { if (src[j] === "\\") j++; if (src[j] === "\n") err("Unterminated string"); j++; }
      if (j >= src.length) err("Unterminated string");
      out.push({ kind: "string", text: src.slice(i, j + 1), line });
      i = j + 1;
      continue;
    }
    if (src.startsWith("...", i)) { out.push({ kind: "punct", text: "...", line }); i += 3; continue; }
    if ("!$&():=@[]{|}".includes(c)) { out.push({ kind: "punct", text: c, line }); i++; continue; }
    const num = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(src.slice(i));
    if (num) { out.push({ kind: "number", text: num[0], line }); i += num[0].length; continue; }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (name) { out.push({ kind: "name", text: name[0], line }); i += name[0].length; continue; }
    err(`Unexpected character "${c}"`);
  }
  return out;
}

const DEFINITION = new Set(["query", "mutation", "subscription", "fragment", "type", "input", "enum", "interface", "union", "scalar", "schema", "extend", "directive"]);

export function minifyTokens(tokens: Token[]): string {
  let out = "";
  let prev: Token | null = null;
  const wordy = (x: Token) => x.kind === "name" || x.kind === "number" || x.kind === "string";
  for (const t of tokens) {
    if (t.kind === "comment") continue;
    if (prev && wordy(prev) && wordy(t)) out += " ";
    out += t.text;
    prev = t;
  }
  return out;
}

const isP = (t: Token | null, ...texts: string[]) => t !== null && t.kind === "punct" && texts.includes(t.text);
const endsValue = (t: Token) => t.kind !== "punct" || isP(t, ")", "]", "!", "}");

export function formatTokens(tokens: Token[], indentUnit: string): string {
  let out = "";
  let depth = 0, parens = 0, brackets = 0, objects = 0;
  const stack: Array<"block" | "obj"> = [];
  let atLineStart = true;
  let forceBreak = false;
  let prev: Token | null = null;
  const inline = () => parens > 0 || brackets > 0 || objects > 0;
  const nl = () => { out = out.replace(/[ \t]+$/, ""); if (out && !out.endsWith("\n")) out += "\n"; atLineStart = true; };
  const write = (s: string) => { if (atLineStart) { out += indentUnit.repeat(depth); atLineStart = false; } out += s; };

  for (const t of tokens) {
    const p = prev;
    if (t.kind === "comment") {
      if (p && !atLineStart && t.line === p.line) out += " " + t.text;
      else { if (!atLineStart) nl(); write(t.text); }
      forceBreak = true;
      prev = t;
      continue;
    }
    // ---- decide whether to start a new line before this token
    let brk = forceBreak && p !== null;
    let blank = false;
    if (!brk && p && !inline() && !isP(t, "}", "{", "(", ")", ":", "!", "=", "@", "]", "|", "&")) {
      const top = stack[stack.length - 1];
      const startsItem = t.kind === "name" || t.kind === "string" || isP(t, "...");
      const continuesItem = isP(p, ":", "@", "...", "=", "|", "&", "$", "(", "[", "{") || (p.kind === "name" && ["on", "implements", "extend"].includes(p.text));
      if (stack.length === 0) {
        if (t.kind === "name" && DEFINITION.has(t.text) && !(p.kind === "name" && p.text === "extend") && endsValue(p)) { brk = true; blank = true; }
        else if (t.kind === "string" && endsValue(p)) { brk = true; blank = true; }
      } else if (top === "block" && startsItem && !continuesItem && endsValue(p)) brk = true;
    }
    if (!brk && p && isP(p, "}") && stack.length === 0 && !inline()) { brk = true; blank = true; }
    if (brk && p && isP(p, "}") && stack.length === 0 && !inline()) blank = true;
    if (brk) { nl(); if (blank && out) out += "\n"; forceBreak = false; }

    // ---- braces
    if (isP(t, "{")) {
      if (inline()) { write(p && isP(p, "(", "[") ? "{ " : p && isP(p, ":") ? " { " : p && !atLineStart ? ", { " : "{ "); stack.push("obj"); objects++; }
      else { write(atLineStart ? "{" : " {"); stack.push("block"); depth++; nl(); }
      prev = t; continue;
    }
    if (isP(t, "}")) {
      const kind = stack.pop();
      if (kind === "obj") { objects = Math.max(0, objects - 1); out = out.replace(/ +$/, ""); write(" }"); }
      else { depth = Math.max(0, depth - 1); nl(); write("}"); forceBreak = true; }
      prev = t; continue;
    }

    // ---- separator
    let sep = "";
    if (!atLineStart && p) {
      if (isP(t, "(", ")", "]", ":", "!")) sep = "";
      else if (isP(t, "[")) sep = isP(p, ":", "=") ? " " : "";
      else if (isP(p, "(", "[", "$", "@", "{")) sep = "";
      else if (isP(p, "...")) sep = t.kind === "name" && t.text === "on" ? " " : "";
      else if (isP(p, ":", "=", "|", "&") || isP(t, "=", "|", "&")) sep = " ";
      else if (inline() && endsValue(p) && (t.kind !== "punct" || isP(t, "$"))) sep = ", ";
      else sep = " ";
      if (isP(t, "(") && p.kind === "name") sep = "";
      if (isP(t, "(") && isP(p, "]", "!", ")")) sep = "";
    }
    if (isP(t, "(")) parens++;
    if (isP(t, "[")) brackets++;
    if (isP(t, ")")) parens = Math.max(0, parens - 1);
    if (isP(t, "]")) brackets = Math.max(0, brackets - 1);
    write(sep + t.text);
    prev = t;
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function formatGraphql(input: string, options: GraphqlFormatterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  try {
    const tokens = tokenize(input);
    let braces = 0, parens = 0, brackets = 0;
    for (const t of tokens) {
      if (t.kind !== "punct") continue;
      if (t.text === "{") braces++; else if (t.text === "}") braces--; else if (t.text === "(") parens++; else if (t.text === ")") parens--; else if (t.text === "[") brackets++; else if (t.text === "]") brackets--;
      if (braces < 0 || parens < 0 || brackets < 0) return { output: "", error: { message: `Unmatched closing bracket at line ${t.line}`, line: t.line } };
    }
    if (braces || parens || brackets) return { output: "", error: { message: "Unbalanced brackets: a { ( or [ is never closed" } };
    if (options.mode === "minify") return { output: minifyTokens(tokens), error: null };
    return { output: formatTokens(tokens, options.indent === "tab" ? "\t" : " ".repeat(Number(options.indent))), error: null };
  } catch (e) {
    if (e instanceof GqlError) return { output: "", error: { message: e.message, line: e.line, column: e.column } };
    return { output: "", error: { message: (e as Error).message } };
  }
}
