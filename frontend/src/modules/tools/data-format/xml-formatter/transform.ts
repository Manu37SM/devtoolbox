import type { XmlFormatterOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

/**
 * Re-indents (or minifies) XML without rewriting its content: comments, the
 * XML declaration, DOCTYPE, processing instructions, CDATA sections, entity
 * references and attribute quoting are kept exactly as written. Only
 * whitespace between tags changes, plus whatever the options ask for.
 */

type Token =
  | { t: "open"; name: string; attrs: Attr[]; selfClosing: boolean; line: number }
  | { t: "close"; name: string; line: number }
  | { t: "text"; raw: string }
  | { t: "cdata"; raw: string }
  | { t: "comment"; raw: string }
  | { t: "pi"; raw: string }
  | { t: "doctype"; raw: string };

interface Attr {
  name: string;
  /** Includes the original quotes. */
  quoted: string;
}

class XmlError extends Error {}

function lineAt(src: string, pos: number): number {
  let n = 1;
  for (let i = 0; i < pos; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
}

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const take = (end: string, what: string) => {
    const j = src.indexOf(end, i);
    if (j < 0) throw new XmlError(`Unterminated ${what} starting on line ${lineAt(src, i)}`);
    const raw = src.slice(i, j + end.length);
    i = j + end.length;
    return raw;
  };
  while (i < src.length) {
    if (src.startsWith("<!--", i)) out.push({ t: "comment", raw: take("-->", "comment") });
    else if (src.startsWith("<![CDATA[", i)) out.push({ t: "cdata", raw: take("]]>", "CDATA section") });
    else if (src.startsWith("<?", i)) out.push({ t: "pi", raw: take("?>", "processing instruction") });
    else if (src.startsWith("<!", i)) {
      // DOCTYPE, possibly with an internal subset in [...]
      const start = i;
      let depth = 0;
      for (; i < src.length; i++) {
        const c = src[i];
        if (c === "[") depth++;
        else if (c === "]") depth--;
        else if (c === ">" && depth === 0) break;
      }
      if (i >= src.length) throw new XmlError(`Unterminated declaration starting on line ${lineAt(src, start)}`);
      i++;
      out.push({ t: "doctype", raw: src.slice(start, i) });
    } else if (src[i] === "<") {
      const start = i;
      const line = lineAt(src, start);
      if (src[i + 1] === "/") {
        const m = /^<\/\s*([^\s>]+)\s*>/.exec(src.slice(i, i + 1000));
        if (!m) throw new XmlError(`Malformed closing tag on line ${line}`);
        out.push({ t: "close", name: m[1]!, line });
        i += m[0].length;
        continue;
      }
      const nameMatch = /^<([A-Za-z_:][\w.:-]*)/.exec(src.slice(i, i + 1000));
      if (!nameMatch) throw new XmlError(`Unexpected "<" on line ${line}`);
      i += nameMatch[0].length;
      const attrs: Attr[] = [];
      for (;;) {
        while (i < src.length && /\s/.test(src[i]!)) i++;
        if (src.startsWith("/>", i)) {
          i += 2;
          out.push({ t: "open", name: nameMatch[1]!, attrs, selfClosing: true, line });
          break;
        }
        if (src[i] === ">") {
          i++;
          out.push({ t: "open", name: nameMatch[1]!, attrs, selfClosing: false, line });
          break;
        }
        const a = /^([^\s=/>]+)\s*=\s*("[^"]*"|'[^']*')/.exec(src.slice(i, i + 100000));
        if (!a) throw new XmlError(`Malformed attribute in <${nameMatch[1]}> on line ${lineAt(src, i)}`);
        attrs.push({ name: a[1]!, quoted: a[2]! });
        i += a[0].length;
      }
    } else {
      const j = src.indexOf("<", i);
      const raw = src.slice(i, j < 0 ? src.length : j);
      i = j < 0 ? src.length : j;
      out.push({ t: "text", raw });
    }
  }
  return out;
}

function check(tokens: Token[]): void {
  const stack: Array<{ name: string; line: number }> = [];
  let roots = 0;
  for (const tok of tokens) {
    if (tok.t === "open") {
      if (stack.length === 0) roots++;
      if (!tok.selfClosing) stack.push({ name: tok.name, line: tok.line });
    } else if (tok.t === "close") {
      const top = stack.pop();
      if (!top) throw new XmlError(`Closing tag </${tok.name}> on line ${tok.line} has no matching opening tag`);
      if (top.name !== tok.name) {
        throw new XmlError(`Expected </${top.name}> (opened on line ${top.line}) but found </${tok.name}> on line ${tok.line}`);
      }
    } else if (tok.t === "text" && stack.length === 0 && tok.raw.trim()) {
      throw new XmlError("Text outside the root element");
    }
  }
  if (stack.length) throw new XmlError(`<${stack[stack.length - 1]!.name}> opened on line ${stack[stack.length - 1]!.line} is never closed`);
  if (roots === 0) throw new XmlError("No root element found");
  if (roots > 1) throw new XmlError("More than one root element");
}

export function formatXml(input: string, options: XmlFormatterOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  try {
    let tokens = tokenize(input.replace(/^﻿/, ""));
    check(tokens);
    if (options.stripComments) tokens = tokens.filter((t) => t.t !== "comment");
    return { output: options.mode === "minify" ? minify(tokens, options) : pretty(tokens, options), error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Invalid XML" } };
  }
}

function openTag(tok: Extract<Token, { t: "open" }>, o: XmlFormatterOptions, pad: string, unit: string, empty: boolean): string {
  const attrs = o.sortAttributes ? [...tok.attrs].sort((a, b) => attrRank(a.name) - attrRank(b.name) || a.name.localeCompare(b.name)) : tok.attrs;
  const close = empty ? (o.expandEmpty ? `></${tok.name}>` : "/>") : ">";
  if (o.attributesPerLine && attrs.length > 1) {
    return `<${tok.name}\n${attrs.map((a) => `${pad}${unit}${a.name}=${a.quoted}`).join("\n")}${empty && !o.expandEmpty ? " " : ""}${close}`;
  }
  const list = attrs.map((a) => ` ${a.name}=${a.quoted}`).join("");
  return `<${tok.name}${list}${empty && !o.expandEmpty ? " " : ""}${close}`;
}

/** Namespace declarations first when sorting, as most XML style guides do. */
function attrRank(name: string): number {
  return name === "xmlns" ? 0 : name.startsWith("xmlns:") ? 1 : 2;
}

function pretty(tokens: Token[], o: XmlFormatterOptions): string {
  const unit = o.indent === "tab" ? "\t" : " ".repeat(Number(o.indent) || 2);
  const lines: string[] = [];
  let depth = 0;
  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k]!;
    const pad = unit.repeat(depth);
    if (tok.t === "text") {
      const text = tok.raw.trim();
      if (text) lines.push(pad + text);
      continue;
    }
    if (tok.t === "open") {
      if (tok.selfClosing) {
        lines.push(pad + openTag(tok, o, pad, unit, true));
        continue;
      }
      // <a></a> -> empty element; <a>text</a> or <a><![CDATA[..]]></a> -> one line.
      const next = tokens[k + 1];
      const after = tokens[k + 2];
      if (next?.t === "close" && next.name === tok.name) {
        lines.push(pad + openTag(tok, o, pad, unit, true));
        k += 1;
        continue;
      }
      if ((next?.t === "text" || next?.t === "cdata") && after?.t === "close" && after.name === tok.name && !/\n/.test(next.raw.trim())) {
        const inner = next.t === "text" ? next.raw.trim() : next.raw;
        lines.push(`${pad}${openTag(tok, o, pad, unit, false)}${inner}</${tok.name}>`);
        k += 2;
        continue;
      }
      lines.push(pad + openTag(tok, o, pad, unit, false));
      depth++;
      continue;
    }
    if (tok.t === "close") {
      depth = Math.max(0, depth - 1);
      lines.push(unit.repeat(depth) + `</${tok.name}>`);
      continue;
    }
    lines.push(pad + tok.raw);
  }
  return lines.join("\n");
}

function minify(tokens: Token[], o: XmlFormatterOptions): string {
  let out = "";
  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k]!;
    if (tok.t === "text") out += tok.raw.trim() ? tok.raw.replace(/\s+/g, " ").trim() : "";
    else if (tok.t === "open") {
      const next = tokens[k + 1];
      if (!tok.selfClosing && next?.t === "close" && next.name === tok.name) {
        out += openTag(tok, { ...o, attributesPerLine: false }, "", "", true).replace(" />", "/>");
        k++;
      } else out += openTag(tok, { ...o, attributesPerLine: false }, "", "", tok.selfClosing).replace(" />", "/>");
    } else if (tok.t === "close") out += `</${tok.name}>`;
    else out += tok.raw;
  }
  return out;
}
