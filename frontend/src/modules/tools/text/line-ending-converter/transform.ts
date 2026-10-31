import type { TransformResult } from "@/lib/tool-transform";
import type { LineEndingConverterOptions } from "./schema";

const BOM = "﻿";
// zero-width space/non-joiner/joiner, word joiner, LRM/RLM, bidi embeddings and isolates, soft hyphen, invisible operators
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩­᠎﻿]/g;
const EXOTIC_SPACE = /[   -   　]/g;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export interface EolStats {
  lf: number;
  crlf: number;
  cr: number;
  bom: boolean;
  trailingSpaceLines: number;
  tabIndentLines: number;
  spaceIndentLines: number;
  invisible: number;
  exoticSpaces: number;
  control: number;
  endsWithNewline: boolean;
  lines: number;
}

export function analyse(text: string): EolStats {
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/\n/g) ?? []).length - crlf;
  const cr = (text.match(/\r(?!\n)/g) ?? []).length;
  const body = text.startsWith(BOM) ? text.slice(1) : text;
  const lines = body.split(/\r\n|\n|\r/);
  return {
    lf, crlf, cr, bom: text.startsWith(BOM),
    trailingSpaceLines: lines.filter((l) => /[ \t]+$/.test(l)).length,
    tabIndentLines: lines.filter((l) => /^ *\t/.test(l)).length,
    spaceIndentLines: lines.filter((l) => /^ {2,}\S/.test(l)).length,
    invisible: (body.match(INVISIBLE) ?? []).length,
    exoticSpaces: (body.match(EXOTIC_SPACE) ?? []).length,
    control: (body.match(CONTROL) ?? []).length,
    endsWithNewline: /(\r\n|\n|\r)$/.test(body),
    lines: body.length === 0 ? 0 : body.endsWith("\n") || body.endsWith("\r") ? lines.length - 1 : lines.length,
  };
}

const kinds = (s: EolStats) => [s.lf && "LF", s.crlf && "CRLF", s.cr && "CR"].filter(Boolean) as string[];

/** Expand tabs to the next tab stop, exactly like `expand -t N`. */
function expandLine(line: string, width: number, leadingOnly: boolean): string {
  let out = "";
  let col = 0;
  let inLead = true;
  for (const ch of line) {
    if (ch === "\t" && (!leadingOnly || inLead)) {
      const n = width - (col % width);
      out += " ".repeat(n);
      col += n;
    } else {
      if (ch !== " " && ch !== "\t") inLead = false;
      out += ch;
      col += 1;
    }
  }
  return out;
}

/** Replace the leading run of blanks by tabs where it covers whole tab stops (like `unexpand --first-only`). */
function unexpandLine(line: string, width: number): string {
  const m = /^[ \t]*/.exec(line)![0];
  if (!m) return line;
  const rest = line.slice(m.length);
  const cols = expandLine(m, width, false).length;
  const tabs = Math.floor(cols / width);
  return "\t".repeat(tabs) + " ".repeat(cols - tabs * width) + rest;
}

export function lineEndingConverter(input: string, options: Partial<LineEndingConverterOptions>): TransformResult {
  const o: LineEndingConverterOptions = {
    eol: options.eol ?? "lf", bom: options.bom ?? "remove", trimTrailing: options.trimTrailing ?? true, finalNewline: options.finalNewline ?? "add",
    tabsToSpaces: options.tabsToSpaces ?? "none", spacesToTabs: options.spacesToTabs ?? false, tabWidth: options.tabWidth ?? 4,
    maxBlankLines: options.maxBlankLines ?? 0, removeInvisible: options.removeInvisible ?? false, normalizeSpaces: options.normalizeSpaces ?? false,
    removeControl: options.removeControl ?? false, output: options.output ?? "text",
  };
  if (!input) return { output: "", error: null };
  const before = analyse(input);

  let hadBom = input.startsWith(BOM);
  const body = hadBom ? input.slice(1) : input;
  // Split into lines, remembering each original ending so "keep" can restore it.
  const parts = body.split(/(\r\n|\n|\r)/);
  const lines: string[] = [];
  const ends: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    lines.push(parts[i]!);
    ends.push(parts[i + 1] ?? "");
  }
  // A text that ends with a line break yields a final empty "line" with no ending.
  let work = lines.map((l) => {
    let s = l;
    if (o.removeInvisible) s = s.replace(INVISIBLE, "");
    if (o.normalizeSpaces) s = s.replace(EXOTIC_SPACE, " ");
    if (o.removeControl) s = s.replace(CONTROL, "");
    if (o.tabsToSpaces !== "none") s = expandLine(s, o.tabWidth, o.tabsToSpaces === "leading");
    if (o.trimTrailing) s = s.replace(/[ \t]+$/, "");
    if (o.spacesToTabs) s = unexpandLine(s, o.tabWidth);
    return s;
  });

  if (o.maxBlankLines > 0) {
    const keepIdx: number[] = [];
    let run = 0;
    work.forEach((l, i) => {
      const isLast = i === work.length - 1;
      if (l.trim() === "" && !isLast) {
        run++;
        if (run > o.maxBlankLines) return;
      } else run = 0;
      keepIdx.push(i);
    });
    work = keepIdx.map((i) => work[i]!);
    const newEnds = keepIdx.map((i) => ends[i]!);
    ends.length = 0;
    ends.push(...newEnds);
  }

  const eol = o.eol === "lf" ? "\n" : o.eol === "crlf" ? "\r\n" : o.eol === "cr" ? "\r" : null;
  let text = work.map((l, i) => l + (ends[i] === "" ? "" : eol ?? ends[i]!)).join("");

  const nl = eol ?? (before.crlf >= before.lf && before.crlf >= before.cr && before.crlf > 0 ? "\r\n" : before.cr > before.lf ? "\r" : "\n");
  const endsNl = /(\r\n|\n|\r)$/.test(text);
  if (o.finalNewline === "add" && text !== "" && !endsNl) text += nl;
  else if (o.finalNewline === "remove") text = text.replace(/(\r\n|\n|\r)+$/, "");
  else if (o.finalNewline === "single" && text !== "") text = text.replace(/(\r\n|\n|\r)*$/, "") + nl;

  if (o.bom === "add") hadBom = true;
  else if (o.bom === "remove") hadBom = false;
  const result = (hadBom ? BOM : "") + text;

  const after = analyse(result);
  const report = [
    `Line endings:  ${kinds(before).join(" + ") || "none"}${kinds(before).length > 1 ? "  (mixed)" : ""}  →  ${kinds(after).join(" + ") || "none"}`,
    `Lines:         ${before.lines}`,
    `BOM:           ${before.bom ? "present" : "absent"}  →  ${after.bom ? "present" : "absent"}`,
    `Trailing space: ${before.trailingSpaceLines} line(s)  →  ${after.trailingSpaceLines}`,
    `Indentation:   ${before.tabIndentLines} tab-indented, ${before.spaceIndentLines} space-indented line(s)  →  ${after.tabIndentLines} / ${after.spaceIndentLines}`,
    `Invisible characters: ${before.invisible}  →  ${after.invisible}`,
    `Non-breaking/exotic spaces: ${before.exoticSpaces}  →  ${after.exoticSpaces}`,
    `Control characters: ${before.control}  →  ${after.control}`,
    `Final newline: ${before.endsWithNewline ? "yes" : "no"}  →  ${after.endsWithNewline ? "yes" : "no"}`,
    `Size:          ${new TextEncoder().encode(input).length} → ${new TextEncoder().encode(result).length} bytes`,
  ].join("\n");

  if (o.output === "report") return { output: report, error: null };
  if (o.output === "text-and-report") return { output: `${result}\n\n----- report -----\n${report}`, error: null };
  return { output: result, error: null };
}
