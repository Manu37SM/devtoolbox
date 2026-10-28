import type { TransformResult } from "@/lib/tool-transform";
import type { LineToolsOptions } from "./schema";

export function wrapLine(line: string, width: number): string[] {
  if (line.length <= width) return [line];
  const out: string[] = [];
  let cur = "";
  for (const word of line.split(/(\s+)/)) {
    if ((cur + word).length > width && cur.trim()) { out.push(cur.trimEnd()); cur = word.trimStart(); }
    else cur += word;
    while (cur.length > width) { out.push(cur.slice(0, width)); cur = cur.slice(width); }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/**
 * Text lines in, text lines out. The two free-text parameters are `param` and `param2`
 * (their meaning depends on the operation; see the tool's labels).
 */
export function runLineTools(input: string, o: LineToolsOptions): TransformResult {
  const nl = input.includes("\r\n") ? "\r\n" : "\n";
  const hadTrailing = /\r?\n$/.test(input);
  const lines = input.replace(/\r?\n$/, "").split(/\r?\n/);
  if (input === "") return { output: "", error: null };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const unesc = (s: string) => s.replace(/\\t/g, "\t").replace(/\\n/g, "\n");
  let re: RegExp | null = null;
  if (o.operation === "keep-matching" || o.operation === "remove-matching") {
    if (!o.param) return fail("Enter text or a pattern to match");
    try { re = new RegExp(o.useRegex ? o.param : o.param.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), o.ignoreCase ? "i" : ""); }
    catch (e) { return fail(`Invalid regex: ${(e as Error).message}`); }
  }
  let out: string[];
  switch (o.operation) {
    case "number": {
      const start = o.param.trim() === "" ? 1 : Number(o.param);
      if (!Number.isInteger(start)) return fail("Start number must be an integer");
      const w = String(start + lines.length - 1).length;
      out = lines.map((l, i) => `${String(start + i).padStart(w, " ")}${o.param2 !== "" ? unesc(o.param2) : ". "}${l}`);
      break;
    }
    case "prefix-suffix": out = lines.map((l) => `${unesc(o.param)}${l}${unesc(o.param2)}`); break;
    case "join": return { output: lines.join(unesc(o.param)) + (hadTrailing ? nl : ""), error: null };
    case "split": {
      if (!o.param) return fail("Enter a delimiter to split on");
      out = lines.flatMap((l) => l.split(unesc(o.param)));
      break;
    }
    case "reverse-order": out = [...lines].reverse(); break;
    case "trim": out = lines.map((l) => l.trim()); break;
    case "remove-blank": out = lines.filter((l) => l.trim() !== ""); break;
    case "keep-matching": out = lines.filter((l) => re!.test(l)); break;
    case "remove-matching": out = lines.filter((l) => !re!.test(l)); break;
    case "wrap": out = lines.flatMap((l) => wrapLine(l, o.width)); break;
    case "indent": {
      const n = o.param.trim() === "" ? 2 : Number(o.param);
      if (!Number.isInteger(n) || n < 0) return fail("Indent must be a non-negative integer");
      out = lines.map((l) => (l ? " ".repeat(n) + l : l));
      break;
    }
    case "dedent": {
      const ws = lines.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)![0].length);
      const m = ws.length ? Math.min(...ws) : 0;
      out = lines.map((l) => l.slice(Math.min(m, /^[ \t]*/.exec(l)![0].length)));
      break;
    }
    case "column": {
      const idx = Number(o.param);
      if (!Number.isInteger(idx) || idx < 1) return fail("Column must be a number starting at 1");
      const sep = o.param2 === "" ? /\s+/ : unesc(o.param2);
      out = lines.map((l) => (typeof sep === "string" ? l.split(sep) : l.trim().split(sep))[idx - 1] ?? "");
      break;
    }
  }
  return { output: out.join(nl) + (hadTrailing ? nl : ""), error: null };
}
