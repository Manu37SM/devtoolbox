import type { TransformResult } from "@/lib/tool-transform";
import type { MergeChoice, MergeConflictResolverOptions } from "./schema";

export interface Conflict {
  index: number;
  startLine: number;
  endLine: number;
  oursLabel: string;
  theirsLabel: string;
  ours: string[];
  base: string[] | null;
  theirs: string[];
}
export type Segment = { type: "text"; lines: string[] } | { type: "conflict"; conflict: Conflict; raw: string[] };

const START = /^<{7,}(?: (.*))?$/;
const BASE = /^\|{7,}(?: (.*))?$/;
const MID = /^={7,}$/;
const END = /^>{7,}(?: (.*))?$/;

export function parseConflicts(text: string): { segments: Segment[]; conflicts: Conflict[]; eol: string; error: { message: string; line: number } | null } {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const segments: Segment[] = [];
  const conflicts: Conflict[] = [];
  let buf: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = START.exec(lines[i] ?? "");
    if (!m) {
      buf.push(lines[i++] ?? "");
      continue;
    }
    const start = i;
    const ours: string[] = [];
    let base: string[] | null = null;
    const theirs: string[] = [];
    let part: "ours" | "base" | "theirs" = "ours";
    let theirsLabel = "";
    let j = i + 1;
    let closed = false;
    for (; j < lines.length; j++) {
      const l = lines[j] ?? "";
      if (part === "ours" && BASE.test(l)) {
        part = "base";
        base = [];
      } else if (part !== "theirs" && MID.test(l)) part = "theirs";
      else if (part === "theirs" && END.test(l)) {
        theirsLabel = END.exec(l)![1] ?? "";
        closed = true;
        break;
      } else (part === "ours" ? ours : part === "base" ? base! : theirs).push(l);
    }
    if (!closed) return { segments, conflicts, eol, error: { message: `Conflict starting at line ${start + 1} has no closing >>>>>>> marker.`, line: start + 1 } };
    if (buf.length) segments.push({ type: "text", lines: buf });
    buf = [];
    const c: Conflict = { index: conflicts.length + 1, startLine: start + 1, endLine: j + 1, oursLabel: m[1] ?? "", theirsLabel, ours, base, theirs };
    conflicts.push(c);
    segments.push({ type: "conflict", conflict: c, raw: lines.slice(start, j + 1) });
    i = j + 1;
  }
  if (buf.length) segments.push({ type: "text", lines: buf });
  return { segments, conflicts, eol, error: null };
}

function parseOverrides(s: string): Map<number, MergeChoice> | string {
  const map = new Map<number, MergeChoice>();
  const valid = ["ours", "theirs", "both", "both-reverse", "base", "keep"];
  for (const part of s.split(/[,\n;]/).map((x) => x.trim()).filter(Boolean)) {
    const m = /^#?(\d+)\s*[=:]\s*([a-z-]+)$/i.exec(part);
    if (!m || !valid.includes((m[2] ?? "").toLowerCase())) return `Bad override "${part}". Use e.g. 2=theirs (ours, theirs, both, both-reverse, base, keep).`;
    map.set(Number(m[1]), (m[2] ?? "").toLowerCase() as MergeChoice);
  }
  return map;
}

const norm = (ls: string[], ws: boolean) => (ws ? ls.map((l) => l.replace(/\s+/g, "")).filter(Boolean) : ls).join("\n");

export function resolveMergeConflicts(input: string, options: Partial<MergeConflictResolverOptions>): TransformResult {
  const o = {
    defaultChoice: options.defaultChoice ?? "keep",
    overrides: options.overrides ?? "",
    autoIdentical: options.autoIdentical ?? true,
    ignoreWhitespace: options.ignoreWhitespace ?? false,
    output: options.output ?? "resolved",
  };
  if (!input.trim()) return { output: "", error: null };
  const parsed = parseConflicts(input);
  if (parsed.error) return { output: "", error: parsed.error };
  const ov = parseOverrides(o.overrides);
  if (typeof ov === "string") return { output: "", error: { message: ov } };

  if (o.output === "report") {
    if (!parsed.conflicts.length) return { output: "No conflict markers found.", error: null };
    const out = parsed.conflicts.map((c) => {
      const same = norm(c.ours, o.ignoreWhitespace) === norm(c.theirs, o.ignoreWhitespace);
      const ours = c.oursLabel ? ` (${c.oursLabel})` : "";
      const theirs = c.theirsLabel ? ` (${c.theirsLabel})` : "";
      return `#${c.index}  lines ${c.startLine}-${c.endLine}  ours${ours}: ${c.ours.length} line(s)  theirs${theirs}: ${c.theirs.length} line(s)${c.base ? `  base: ${c.base.length} line(s)` : ""}  ${same ? "identical" : "differ"}`;
    });
    out.push("", `${parsed.conflicts.length} conflict(s), ${parsed.conflicts.filter((c) => norm(c.ours, o.ignoreWhitespace) === norm(c.theirs, o.ignoreWhitespace)).length} identical`);
    return { output: out.join("\n"), error: null };
  }

  for (const k of ov.keys()) if (k < 1 || k > parsed.conflicts.length) return { output: "", error: { message: `There is no conflict #${k}; the file has ${parsed.conflicts.length}.` } };
  const out: string[] = [];
  for (const seg of parsed.segments) {
    if (seg.type === "text") {
      out.push(...seg.lines);
      continue;
    }
    const c = seg.conflict;
    let choice: MergeChoice = ov.get(c.index) ?? o.defaultChoice;
    if (o.autoIdentical && !ov.has(c.index) && norm(c.ours, o.ignoreWhitespace) === norm(c.theirs, o.ignoreWhitespace)) choice = "ours";
    if (choice === "base" && !c.base) return { output: "", error: { message: `Conflict #${c.index} has no base section. Use merge.conflictStyle=diff3 to get one.`, line: c.startLine } };
    if (choice === "keep") out.push(...seg.raw);
    else if (choice === "ours") out.push(...c.ours);
    else if (choice === "theirs") out.push(...c.theirs);
    else if (choice === "base") out.push(...c.base!);
    else if (choice === "both") out.push(...c.ours, ...c.theirs);
    else out.push(...c.theirs, ...c.ours);
  }
  return { output: out.join(parsed.eol), error: null };
}
