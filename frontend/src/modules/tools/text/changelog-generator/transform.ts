import type { TransformResult } from "@/lib/tool-transform";
import type { ChangelogGeneratorOptions } from "./schema";

export interface Commit { hash: string; type: string; scope: string; subject: string; breaking: boolean; breakingNote: string; conventional: boolean }

const CC = /^(\w+)(?:\(([^)]*)\))?(!)?:\s+(.+)$/;

export function parseLog(input: string): { commits: Commit[]; merges: number } {
  const text = input.replace(/\r\n/g, "\n");
  const raw: { hash: string; message: string }[] = [];
  if (/^commit [0-9a-f]{7,40}/m.test(text)) {
    for (const block of text.split(/^(?=commit [0-9a-f]{7,40})/m).filter((b) => b.trim())) {
      const hash = /^commit ([0-9a-f]{7,40})/.exec(block)?.[1] ?? "";
      const msg = block.split("\n").filter((l) => /^ {4}/.test(l)).map((l) => l.slice(4)).join("\n").trim();
      raw.push({ hash: hash.slice(0, 7), message: msg });
    }
  } else {
    for (const line of text.split("\n")) {
      const t = line.replace(/^\s*[*-]\s+/, "").trim();
      if (!t) continue;
      const m = /^([0-9a-f]{7,40})\s+(?:-\s+)?(.*)$/.exec(t);
      raw.push(m ? { hash: m[1]!.slice(0, 7), message: m[2]! } : { hash: "", message: t });
    }
  }
  let merges = 0;
  const commits: Commit[] = [];
  for (const r of raw) {
    const [first, ...rest] = r.message.split("\n");
    if (/^Merge (pull request|branch|remote-tracking)/.test(first!)) { merges++; continue; }
    const body = rest.join("\n");
    const footer = /BREAKING[ -]CHANGE:\s*([\s\S]+?)(?:\n\n|$)/.exec(body);
    const m = CC.exec(first!.trim());
    if (m) commits.push({ hash: r.hash, type: m[1]!.toLowerCase(), scope: m[2] ?? "", subject: m[4]!.trim(), breaking: !!m[3] || !!footer, breakingNote: footer?.[1]?.trim().replace(/\s+/g, " ") ?? "", conventional: true });
    else commits.push({ hash: r.hash, type: "other", scope: "", subject: first!.trim(), breaking: /BREAKING[ -]CHANGE/.test(r.message), breakingNote: footer?.[1]?.trim() ?? "", conventional: false });
  }
  return { commits, merges };
}

const SECTIONS: [string, string][] = [["feat", "Features"], ["fix", "Bug Fixes"], ["perf", "Performance"], ["revert", "Reverts"], ["docs", "Documentation"], ["refactor", "Refactoring"], ["test", "Tests"], ["build", "Build"], ["ci", "CI"], ["chore", "Chores"], ["style", "Styles"], ["other", "Other"]];
const VISIBLE_BY_DEFAULT = new Set(["feat", "fix", "perf", "revert"]);

export function nextVersion(current: string, commits: Commit[]): { version: string; bump: string } | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(current.trim());
  if (!m) return null;
  let [maj, min, pat] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const breaking = commits.some((c) => c.breaking);
  const feat = commits.some((c) => c.type === "feat");
  let bump: string;
  if (breaking && maj > 0) { maj++; min = 0; pat = 0; bump = "major (breaking change)"; }
  else if (breaking || feat) { min++; pat = 0; bump = breaking ? "minor (breaking change while still 0.x)" : "minor (new features)"; }
  else { pat++; bump = "patch (fixes only)"; }
  return { version: `${maj}.${min}.${pat}`, bump };
}

export function runChangelogGenerator(input: string, options: ChangelogGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const { commits, merges } = parseLog(input);
  if (!commits.length) return { output: "", error: { message: "No commits found. Paste the output of git log --oneline (or git log)." } };
  const repo = options.repoUrl.trim().replace(/\/+$/, "");
  const link = (c: Commit) => {
    let s = c.subject;
    if (repo) s = s.replace(/\(#(\d+)\)/g, `([#$1](${repo}/pull/$1))`);
    return `${c.scope ? `**${c.scope}:** ` : ""}${s}${c.hash ? ` (${repo ? `[${c.hash}](${repo}/commit/${c.hash})` : c.hash})` : ""}`;
  };
  const next = nextVersion(options.currentVersion, commits);
  const out: string[] = [`## ${next ? next.version : "Unreleased"}`];
  const breaking = commits.filter((c) => c.breaking);
  if (breaking.length) out.push("", "### ⚠ BREAKING CHANGES", ...breaking.map((c) => `- ${c.breakingNote ? `${c.scope ? `**${c.scope}:** ` : ""}${c.breakingNote}` : link(c)}`));
  let hidden = 0;
  for (const [type, title] of SECTIONS) {
    const list = commits.filter((c) => c.type === type || (type === "other" && !SECTIONS.some(([t]) => t === c.type)));
    if (!list.length) continue;
    if (!options.includeOther && !VISIBLE_BY_DEFAULT.has(type)) { hidden += list.length; continue; }
    out.push("", `### ${title}`, ...list.map((c) => `- ${link(c)}`));
  }
  const nonConv = commits.filter((c) => !c.conventional).length;
  const notes = [`<!-- ${commits.length} commit${commits.length === 1 ? "" : "s"}${merges ? `, ${merges} merge commit${merges === 1 ? "" : "s"} skipped` : ""}${hidden ? `, ${hidden} docs/chore/test/other hidden (turn on "Include all types")` : ""}${nonConv ? `, ${nonConv} not in Conventional Commits format` : ""} -->`];
  if (next) notes.push(`<!-- Suggested bump from ${options.currentVersion}: ${next.bump} -->`);
  return { output: [...out, "", ...notes].join("\n"), error: null };
}
