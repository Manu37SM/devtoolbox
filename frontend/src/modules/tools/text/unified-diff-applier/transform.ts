import type { TransformResult } from "@/lib/tool-transform";
import type { UnifiedDiffApplierOptions } from "./schema";

export interface Hunk { oldStart: number; header: string; lines: { op: " " | "-" | "+"; text: string }[]; noNewlineOld: boolean; noNewlineNew: boolean }
export interface PatchFile { oldName: string; newName: string; hunks: Hunk[] }

export function parsePatch(patch: string): PatchFile[] {
  const lines = patch.replace(/\r\n/g, "\n").split("\n");
  const files: PatchFile[] = [];
  let file: PatchFile | null = null;
  let hunk: Hunk | null = null;
  let lastOp: " " | "-" | "+" = " ";
  let remainingOld = 0, remainingNew = 0;
  for (const line of lines) {
    if (hunk && (remainingOld > 0 || remainingNew > 0)) {
      if (line.startsWith("\\")) { if (lastOp === "-") hunk.noNewlineOld = true; else if (lastOp === "+") hunk.noNewlineNew = true; else { hunk.noNewlineOld = true; hunk.noNewlineNew = true; } continue; }
      const op = (line[0] ?? " ") as " " | "-" | "+";
      if (op !== " " && op !== "-" && op !== "+") throw new Error(`Malformed hunk line: "${line}"`);
      hunk.lines.push({ op, text: line.slice(1) });
      lastOp = op;
      if (op !== "+") remainingOld--;
      if (op !== "-") remainingNew--;
      continue;
    }
    if (line.startsWith("\\") && hunk) { if (lastOp === "-") hunk.noNewlineOld = true; else if (lastOp === "+") hunk.noNewlineNew = true; else { hunk.noNewlineOld = true; hunk.noNewlineNew = true; } continue; }
    const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (m) {
      if (!file) { file = { oldName: "", newName: "", hunks: [] }; files.push(file); }
      hunk = { oldStart: Number(m[1]), header: line, lines: [], noNewlineOld: false, noNewlineNew: false };
      remainingOld = m[2] === undefined ? 1 : Number(m[2]);
      remainingNew = m[4] === undefined ? 1 : Number(m[4]);
      file.hunks.push(hunk);
      continue;
    }
    if (line.startsWith("--- ")) { file = { oldName: line.slice(4).replace(/\t.*$/, ""), newName: "", hunks: [] }; files.push(file); hunk = null; continue; }
    if (line.startsWith("+++ ") && file) { file.newName = line.slice(4).replace(/\t.*$/, ""); continue; }
  }
  return files.filter((f) => f.hunks.length);
}

const same = (a: string, b: string, ws: boolean) => (ws ? a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim() : a === b);

export function applyHunks(original: string, hunks: Hunk[], reverse: boolean, ws: boolean): { text: string; report: string[]; failed: number } {
  const hadNewline = original.endsWith("\n");
  const src = original.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  let lines = original === "" ? [] : src;
  let endsWithNewline = hadNewline || original === "";
  const report: string[] = [];
  let contentDelta = 0, drift = 0, failed = 0;
  hunks.forEach((h, i) => {
    const oldBlock = h.lines.filter((l) => l.op !== (reverse ? "-" : "+")).map((l) => l.text);
    const newBlock = h.lines.filter((l) => l.op !== (reverse ? "+" : "-")).map((l) => l.text);
    // -N,0 inserts after line N; otherwise the hunk starts at line N.
    const nominal = Math.max(0, (oldBlock.length === 0 ? h.oldStart : h.oldStart - 1) + contentDelta);
    const expected = Math.max(0, nominal + drift);
    const fits = (pos: number) => pos >= 0 && pos + oldBlock.length <= lines.length && oldBlock.every((t, k) => same(lines[pos + k]!, t, ws));
    let found = -1;
    for (let d = 0; d <= lines.length; d++) {
      if (fits(expected + d)) { found = expected + d; break; }
      if (d > 0 && fits(expected - d)) { found = expected - d; break; }
    }
    if (found < 0) { failed++; report.push(`Hunk ${i + 1} ${h.header}: FAILED (context not found)`); return; }
    lines = [...lines.slice(0, found), ...newBlock, ...lines.slice(found + oldBlock.length)];
    contentDelta += newBlock.length - oldBlock.length;
    drift = found - nominal;
    report.push(`Hunk ${i + 1} ${h.header}: applied${drift !== 0 ? ` with offset ${drift > 0 ? "+" : ""}${drift} line${Math.abs(drift) === 1 ? "" : "s"}` : ""}`);
    if (found + newBlock.length >= lines.length) endsWithNewline = !(reverse ? h.noNewlineOld : h.noNewlineNew);
  });
  return { text: lines.join("\n") + (endsWithNewline && lines.length ? "\n" : ""), report, failed };
}

export function runUnifiedDiffApplier(input: string, patch: string, options: UnifiedDiffApplierOptions): TransformResult {
  if (!patch.trim()) return { output: "", error: null };
  let files: PatchFile[];
  try { files = parsePatch(patch); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  if (!files.length) return { output: "", error: { message: "No @@ hunks found. Paste a unified diff (git diff, diff -u)." } };
  const target = files[0]!;
  const r = applyHunks(input, target.hunks, options.reverse, options.ignoreWhitespace);
  const notes: string[] = [];
  if (files.length > 1) notes.push(`The patch touches ${files.length} files; only ${target.newName || target.oldName || "the first file"} was applied.`);
  if (options.output === "report" || r.failed) {
    const report = [`${target.oldName || "file"} -> ${target.newName || "file"}${options.reverse ? " (reversed)" : ""}`, ...r.report, `${r.report.length - r.failed} of ${r.report.length} hunks applied.`, ...notes];
    if (r.failed && options.output === "result") return { output: "", error: { message: report.join("\n") } };
    return { output: `${report.join("\n")}\n\n${r.text}`, error: null };
  }
  return { output: `${notes.length ? `${notes.join("\n")}\n\n` : ""}${r.text}`, error: null };
}
