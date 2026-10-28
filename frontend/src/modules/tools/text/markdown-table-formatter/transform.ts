import type { TransformResult } from "@/lib/tool-transform";
import type { MarkdownTableFormatterOptions } from "./schema";

type Align = "left" | "center" | "right" | "none";

export function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "|") { cur += "\\|"; i++; }
    else if (s[i] === "|") { cells.push(cur.trim()); cur = ""; }
    else cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
}

export function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && cur === "") q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n" || (c === "\r" && text[i + 1] === "\n")) { if (c === "\r") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (q) throw new Error("Unterminated quoted field");
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const parseAlign = (c: string): Align | null => {
  const m = /^(:)?-{1,}(:)?$/.exec(c.replace(/\s/g, ""));
  if (!m) return null;
  return m[1] && m[2] ? "center" : m[2] ? "right" : m[1] ? "left" : "none";
};

const width = (s: string) => [...s].reduce((w, ch) => w + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/.test(ch) || (ch.codePointAt(0)! >= 0x1F300 && ch.codePointAt(0)! <= 0x1FAFF) ? 2 : 1), 0);

export function formatTable(rows: string[][], aligns: Align[], o: MarkdownTableFormatterOptions): string {
  const n = Math.max(...rows.map((r) => r.length), aligns.length);
  const norm = rows.map((r) => Array.from({ length: n }, (_, i) => (r[i] ?? "").replace(/\r?\n/g, "<br>").replace(/(?<!\\)\|/g, "\\|")));
  const al: Align[] = Array.from({ length: n }, (_, i) => (o.align === "keep" ? aligns[i] ?? "none" : o.align));
  const w = Array.from({ length: n }, (_, c) => Math.max(o.compact ? 3 : 3, ...norm.map((r) => width(r[c]!))));
  const pad = (s: string, c: number) => {
    if (o.compact) return s;
    const gap = w[c]! - width(s);
    return al[c] === "right" ? " ".repeat(gap) + s : al[c] === "center" ? " ".repeat(Math.floor(gap / 2)) + s + " ".repeat(Math.ceil(gap / 2)) : s + " ".repeat(gap);
  };
  const line = (r: string[]) => "| " + r.map((x, c) => pad(x, c)).join(" | ") + " |";
  const delim = al.map((a, c) => { const d = "-".repeat(o.compact ? 3 : w[c]!); return a === "center" ? ":" + d.slice(2) + ":" : a === "right" ? d.slice(1) + ":" : a === "left" ? ":" + d.slice(1) : d; });
  return [line(norm[0]!), "| " + delim.join(" | ") + " |", ...norm.slice(1).map(line)].join("\n");
}

export function runMarkdownTable(input: string, o: MarkdownTableFormatterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  try {
    if (o.source !== "markdown") {
      const rows = parseCsv(input, o.source === "tsv" ? "\t" : ",");
      if (rows.length < 1) return { output: "", error: null };
      return { output: formatTable(rows, [], o) + "\n", error: null };
    }
    const lines = input.split(/\r?\n/).filter((l) => l.trim());
    const bad = lines.findIndex((l) => !l.includes("|"));
    if (bad >= 0) return { output: "", error: { message: "Line has no | separator; is this a Markdown table?", line: bad + 1 } };
    if (lines.length < 2) return { output: "", error: { message: "A table needs a header row and a delimiter row (---)", line: 1 } };
    const delimCells = splitRow(lines[1]!);
    const aligns = delimCells.map(parseAlign);
    if (aligns.some((a) => a === null)) return { output: "", error: { message: "Second line must be the delimiter row, e.g. | --- | :---: |", line: 2 } };
    const header = splitRow(lines[0]!);
    if (header.length !== delimCells.length) return { output: "", error: { message: `Header has ${header.length} columns but the delimiter row has ${delimCells.length}`, line: 2 } };
    const rows = [header, ...lines.slice(2).map(splitRow)];
    return { output: formatTable(rows, aligns as Align[], o) + "\n", error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
