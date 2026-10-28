import type { TransformResult } from "@/lib/tool-transform";
import type { LinkHeaderParserOptions } from "./schema";

export interface LinkEntry { url: string; params: Record<string, string> }

/** RFC 8288 Link header parser. Handles quoted params, commas inside <>/quotes and multiple header lines. */
export function parseLinkHeader(text: string): LinkEntry[] {
  const s = text.replace(/^\s*link\s*:\s*/im, "").replace(/\r?\n(?=\s*<)/g, ",");
  const out: LinkEntry[] = [];
  let i = 0;
  const ws = () => { while (i < s.length && /[\s,]/.test(s[i]!)) i++; };
  ws();
  while (i < s.length) {
    if (s[i] !== "<") throw new Error(`Expected "<" at position ${i + 1}`);
    const end = s.indexOf(">", i);
    if (end < 0) throw new Error('Unterminated "<" in URI reference');
    const entry: LinkEntry = { url: s.slice(i + 1, end), params: {} };
    i = end + 1;
    while (true) {
      while (i < s.length && /\s/.test(s[i]!)) i++;
      if (s[i] !== ";") break;
      i++;
      while (i < s.length && /\s/.test(s[i]!)) i++;
      const km = /^[A-Za-z0-9!#$&+.^_`|~*-]+/.exec(s.slice(i));
      if (!km) throw new Error(`Expected a parameter name at position ${i + 1}`);
      const key = km[0].toLowerCase();
      i += km[0].length;
      let val = "";
      if (s[i] === "=") {
        i++;
        if (s[i] === '"') {
          i++;
          while (i < s.length && s[i] !== '"') { if (s[i] === "\\") i++; val += s[i++] ?? ""; }
          if (s[i] !== '"') throw new Error("Unterminated quoted parameter value");
          i++;
        } else {
          const vm = /^[^;,\s]*/.exec(s.slice(i))!;
          val = vm[0]; i += val.length;
        }
      }
      if (!(key in entry.params)) entry.params[key] = val;
    }
    out.push(entry);
    ws();
  }
  if (!out.length) throw new Error("No link-value found");
  return out;
}

export function runLinkHeader(input: string, o: LinkHeaderParserOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  try {
    const links = parseLinkHeader(input);
    if (o.format === "json") return { output: JSON.stringify(links.map((l) => ({ url: l.url, ...l.params })), null, 2), error: null };
    const out = links.map((l, i) => {
      const { rel, ...rest } = l.params;
      const rows = [`${i + 1}. ${l.url}`, `   rel: ${rel ?? "(none)"}`, ...Object.entries(rest).map(([k, v]) => `   ${k}: ${v}`)];
      const hints: string[] = [];
      if (rel && /preload|prefetch/.test(rel) && !rest.as && /preload/.test(rel)) hints.push('rel=preload should include as="..." so the browser sets the right priority and Accept header');
      if (rel?.includes("preconnect") && /^\//.test(l.url)) hints.push("preconnect needs an absolute origin, not a path");
      if (rel === undefined) hints.push("missing rel parameter (RFC 8288 §3.3)");
      return [...rows, ...hints.map((h) => `   ⚠ ${h}`)].join("\n");
    });
    return { output: out.join("\n\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
