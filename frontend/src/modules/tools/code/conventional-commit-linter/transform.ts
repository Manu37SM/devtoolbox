import type { TransformResult } from "@/lib/tool-transform";
import type { ConventionalCommitLinterOptions } from "./schema";

export const TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"];

export interface ParsedCommit {
  type: string | null;
  scope: string | null;
  breakingBang: boolean;
  description: string;
  body: string[];
  footers: Array<{ token: string; value: string }>;
  header: string;
}

export interface Issue { level: "error" | "warning"; message: string }

const HEADER = /^(\w+)(?:\(([^()]*)\))?(!)?:\s?(.*)$/;
const FOOTER = /^(BREAKING[ -]CHANGE|[A-Za-z][A-Za-z-]*)(?::\s|\s#)(.*)$/;

export function parseCommit(message: string): ParsedCommit {
  const lines = message.replace(/\r\n/g, "\n").replace(/\s+$/, "").split("\n");
  const header = lines[0] ?? "";
  const m = HEADER.exec(header);
  const rest = lines.slice(1);
  // footers = trailing block of "Token: value" lines after the last blank line
  let footerStart = rest.length;
  const lastBlank = rest.lastIndexOf("");
  if (lastBlank >= 0 && rest.slice(lastBlank + 1).length && rest.slice(lastBlank + 1).every((l, i) => FOOTER.test(l) || (i > 0 && !FOOTER.test(l) && !/^\s*$/.test(l)))) {
    if (FOOTER.test(rest[lastBlank + 1]!)) footerStart = lastBlank + 1;
  }
  const footers: ParsedCommit["footers"] = [];
  for (const l of rest.slice(footerStart)) {
    const f = FOOTER.exec(l);
    if (f) footers.push({ token: f[1]!, value: f[2]! });
    else if (footers.length) footers[footers.length - 1]!.value += "\n" + l;
  }
  const body = rest.slice(0, footerStart);
  while (body.length && body[0] === "") body.shift();
  while (body.length && body[body.length - 1] === "") body.pop();
  return {
    type: m ? m[1]! : null,
    scope: m ? (m[2] ?? null) : null,
    breakingBang: !!m?.[3],
    description: m ? m[4]! : header,
    body,
    footers,
    header,
  };
}

export function lintCommit(message: string, options: ConventionalCommitLinterOptions): { parsed: ParsedCommit; issues: Issue[]; bump: "major" | "minor" | "patch" | "none" } {
  const parsed = parseCommit(message);
  const issues: Issue[] = [];
  const err = (m: string) => issues.push({ level: "error", message: m });
  const warn = (m: string) => issues.push({ level: "warning", message: m });
  const lines = message.replace(/\r\n/g, "\n").replace(/\s+$/, "").split("\n");
  if (parsed.type === null) {
    err('Header must look like "type(scope): description" or "type: description"');
  } else {
    if (parsed.type !== parsed.type.toLowerCase()) err(`Type "${parsed.type}" must be lower-case`);
    if (options.strictTypes && !TYPES.includes(parsed.type.toLowerCase())) err(`Unknown type "${parsed.type}" — expected one of ${TYPES.join(", ")}`);
    if (parsed.scope !== null && parsed.scope.trim() === "") err("Scope is empty — remove the parentheses or add a scope");
    if (parsed.scope && /\s/.test(parsed.scope)) warn("Scope contains whitespace; use a single noun like (api) or (auth)");
  }
  const d = parsed.description.trim();
  if (!d) err("Description is empty");
  else {
    if (/^[A-Z]/.test(d) && !/^[A-Z]{2,}/.test(d)) warn("Description should start with a lower-case letter");
    if (/[.!]$/.test(d)) warn("Description should not end with punctuation");
    const first = d.split(/\s+/)[0]!.toLowerCase();
    if (/^(added|fixed|updated|removed|changed|adds|fixes|updates|removes|changes|adding|fixing|updating|removing|changing)$/.test(first)) warn(`Use the imperative mood ("${first.replace(/(ed|s|ing)$/, "")}" rather than "${first}")`);
  }
  if (lines[0]!.length > options.maxHeader) err(`Header is ${lines[0]!.length} characters; limit is ${options.maxHeader}`);
  if (lines.length > 1 && lines[1] !== "") err("Leave a blank line between the header and the body");
  parsed.body.forEach((l, i) => { if (l.length > 100 && !/^\s*(https?:\/\/|\S+$)/.test(l)) warn(`Body line ${i + 1} is ${l.length} characters; wrap at 100`); });
  const breaking = parsed.breakingBang || parsed.footers.some((f) => /^BREAKING[ -]CHANGE$/.test(f.token));
  for (const f of parsed.footers) if (/^BREAKING[ -]CHANGE$/.test(f.token) && !f.value.trim()) err("BREAKING CHANGE footer needs a description");
  if (parsed.type === "revert" && !parsed.footers.some((f) => /^Refs?$/i.test(f.token)) && !/This reverts commit/i.test(message)) warn('Reverts should reference the reverted commit (e.g. "Refs: <sha>")');
  const t = parsed.type?.toLowerCase();
  const bump = breaking ? "major" : t === "feat" ? "minor" : t === "fix" || t === "perf" ? "patch" : "none";
  return { parsed, issues, bump };
}

export function checkCommit(input: string, options: ConventionalCommitLinterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const { parsed, issues, bump } = lintCommit(input, options);
  const errors = issues.filter((i) => i.level === "error");
  const out = [
    errors.length ? `✗ ${errors.length} error${errors.length === 1 ? "" : "s"}, ${issues.length - errors.length} warning(s)` : issues.length ? `✓ Valid, ${issues.length} warning(s)` : "✓ Valid Conventional Commit",
    "",
    `Type:        ${parsed.type ?? "—"}`,
    `Scope:       ${parsed.scope ?? "—"}`,
    `Description: ${parsed.description || "—"}`,
    `Breaking:    ${bump === "major" ? "yes" : "no"}`,
    `Body:        ${parsed.body.length ? `${parsed.body.length} line(s)` : "—"}`,
    `Footers:     ${parsed.footers.length ? parsed.footers.map((f) => `${f.token}: ${f.value.split("\n")[0]}`).join("; ") : "—"}`,
    `SemVer bump: ${bump}`,
  ];
  if (issues.length) out.push("", ...issues.map((i) => `${i.level === "error" ? "ERROR  " : "WARNING"}  ${i.message}`));
  return { output: out.join("\n"), error: errors.length ? { message: errors[0]!.message } : null };
}
