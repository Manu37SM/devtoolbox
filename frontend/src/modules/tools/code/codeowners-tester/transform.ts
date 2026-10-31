import type { TransformResult } from "@/lib/tool-transform";
import type { CodeownersTesterOptions } from "./schema";

type Opts = CodeownersTesterOptions;

export interface Rule {
  line: number;
  pattern: string;
  owners: string[];
  section: string | null;
  re: RegExp;
  /** features that CODEOWNERS (GitHub) does not support */
  problems: string[];
  /** explicit "no owners" rule */
  unset: boolean;
}

export interface Section {
  name: string;
  optional: boolean;
  approvals: number;
  defaults: string[];
  line: number;
}

const OWNER = /^(@[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

/** Strip a trailing comment: `#` starts a comment unless escaped with a backslash. */
function stripComment(line: string): string {
  let out = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === "\\" && i + 1 < line.length) {
      out += c + line[i + 1];
      i++;
    } else if (c === "#") break;
    else out += c;
  }
  return out;
}

/** Split on whitespace, but keep `\ ` (escaped space) inside the pattern token. */
function splitTokens(line: string): string[] {
  const t: string[] = [];
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === "\\" && line[i + 1] === " ") {
      cur += "\\ ";
      i++;
    } else if (/\s/.test(c)) {
      if (cur) t.push(cur);
      cur = "";
    } else cur += c;
  }
  if (cur) t.push(cur);
  return t;
}

const esc = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");

/** Translate a CODEOWNERS pattern to a regular expression over repo-relative file paths. */
export function patternToRegex(pattern: string, ci: boolean): { re: RegExp; problems: string[] } {
  const problems: string[] = [];
  let p = pattern;
  if (p.startsWith("!")) problems.push("negation (!) is not supported in CODEOWNERS; the rule is treated literally");
  if (/\[[^\]]*\]/.test(p)) problems.push("character classes [...] are not supported in CODEOWNERS");
  if (/\\[^# ]/.test(p)) problems.push("only \\# and \\<space> can be escaped in CODEOWNERS");
  if (p.startsWith("./")) problems.push("patterns must not start with ./ (use / for the repo root); this rule matches nothing");
  const dirOnly = p.endsWith("/");
  if (dirOnly) p = p.slice(0, -1);
  const anchored = p.startsWith("/") || p.includes("/");
  p = p.replace(/^\//, "");
  const lastSeg = p.split("/").pop() ?? "";
  const wildcardLast = /[*?]/.test(lastSeg) && lastSeg !== "**";

  let body = "";
  for (let i = 0; i < p.length; i++) {
    const c = p[i]!;
    if (c === "\\" && i + 1 < p.length) {
      body += esc(p[++i]!);
    } else if (c === "*") {
      if (p[i + 1] === "*") {
        let j = i;
        while (p[j] === "*") j++;
        const atStart = i === 0;
        const prevSlash = atStart || p[i - 1] === "/";
        const nextSlash = p[j] === "/";
        const atEnd = j === p.length;
        if (prevSlash && nextSlash) {
          body += "(?:.*/)?";
          i = j; // consume the slash too
        } else if (prevSlash && atEnd) {
          body += ".*";
          i = j - 1;
        } else {
          body += "[^/]*";
          i = j - 1;
        }
      } else body += "[^/]*";
    } else if (c === "?") body += "[^/]";
    else body += esc(c);
  }
  // A final wildcard component matches that depth only (GitHub), otherwise it also covers everything below a matched directory.
  const tail = dirOnly ? "/.*" : wildcardLast || /\.\*$/.test(body) ? "" : "(?:/.*)?";
  const head = anchored ? "^" : "^(?:.*/)?";
  return { re: new RegExp(head + body + tail + "$", ci ? "i" : ""), problems };
}

export function parseCodeowners(text: string, o: Opts): { rules: Rule[]; sections: Section[]; warnings: Array<{ line: number; msg: string }> } {
  const rules: Rule[] = [];
  const sections: Section[] = [];
  const warnings: Array<{ line: number; msg: string }> = [];
  let section: Section | null = null;
  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    const body = stripComment(raw).trim();
    if (!body) return;
    if (o.flavor === "gitlab") {
      const sm = /^(\^)?\[([^\]]+)\](?:\[(\d+)\])?\s*(.*)$/.exec(body);
      if (sm) {
        const defaults = splitTokens(sm[4] ?? "");
        section = { name: sm[2]!, optional: !!sm[1], approvals: sm[3] ? Number(sm[3]) : 1, defaults, line };
        sections.push(section);
        for (const d of defaults) if (!OWNER.test(d)) warnings.push({ line, msg: `invalid default owner "${d}"` });
        return;
      }
    }
    const tok = splitTokens(body);
    const pattern = tok[0]!;
    const owners = tok.slice(1);
    const { re, problems } = patternToRegex(pattern, o.caseInsensitive);
    for (const ow of owners) if (!OWNER.test(ow)) warnings.push({ line, msg: `"${ow}" is not a valid owner (use @user, @org/team or an email address)` });
    const eff = owners.length === 0 && section ? section.defaults : owners;
    rules.push({ line, pattern, owners: eff, section: section?.name ?? null, re, problems, unset: owners.length === 0 && eff.length === 0 });
    for (const p of problems) warnings.push({ line, msg: p });
  });
  return { rules, sections, warnings };
}

export interface Resolution {
  path: string;
  owners: string[];
  /** winning rules (one per section in GitLab mode) */
  wins: Rule[];
  /** every rule that matched this path */
  matched: Rule[];
}

export function resolve(path: string, rules: Rule[], o: Opts): Resolution {
  const p = path.trim().replace(/^\/+/, "").replace(/\\/g, "/");
  const matched = rules.filter((r) => !r.problems.some((x) => x.startsWith("patterns must not start")) && r.re.test(p));
  if (o.flavor === "gitlab") {
    const bySection = new Map<string, Rule>();
    for (const r of matched) bySection.set(r.section ?? "", r);
    const wins = [...bySection.values()];
    const owners = [...new Set(wins.flatMap((w) => w.owners))];
    return { path: p, owners, wins, matched };
  }
  const win = matched.at(-1);
  return { path: p, owners: win ? win.owners : [], wins: win ? [win] : [], matched };
}

export function lint(rules: Rule[], res: Resolution[], o: Opts): Array<{ line: number; msg: string }> {
  const out: Array<{ line: number; msg: string }> = [];
  const seen = new Map<string, Rule>();
  rules.forEach((r, i) => {
    const key = (r.section ?? "") + "\0" + r.pattern.replace(/\/+$/, "").replace(/^\//, "") + (r.pattern.endsWith("/") ? "/" : "") + (r.pattern.startsWith("/") || r.pattern.includes("/") ? "" : "*any");
    const prev = seen.get(key);
    if (prev) out.push({ line: prev.line, msg: `pattern ${prev.pattern} is repeated on line ${r.line}; this rule never wins` });
    seen.set(key, r);
    if (r.unset) out.push({ line: r.line, msg: `${r.pattern} has no owners, so it clears ownership for matching files (intended?)` });
    if ((r.pattern === "*" || r.pattern === "**" || r.pattern === "/**") && i > 0 && !rules.slice(0, i).every((x) => x.section !== r.section)) {
      out.push({ line: r.line, msg: `catch-all ${r.pattern} comes after other rules and overrides all of them; put it first` });
    }
  });
  if (res.length) {
    const wonBy = new Set(res.flatMap((r) => r.wins.map((w) => w.line)));
    for (const r of rules) {
      const matches = res.some((x) => x.matched.includes(r));
      if (!matches) out.push({ line: r.line, msg: `${r.pattern} matches none of the test paths` });
      else if (!wonBy.has(r.line)) out.push({ line: r.line, msg: `${r.pattern} matches test paths but is always overridden by a later rule` });
    }
  }
  void o;
  return out.sort((a, b) => a.line - b.line);
}

export function codeownersTester(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    flavor: options.flavor ?? "github",
    view: options.view ?? "path",
    lint: options.lint ?? true,
    ruleUsage: options.ruleUsage ?? false,
    caseInsensitive: options.caseInsensitive ?? false,
    format: options.format ?? "table",
  };
  if (input.trim() === "") return { output: "", error: null };
  const lines = input.split(/\r?\n/);
  const sep = lines.findIndex((l) => l.trim() === "---");
  const file = (sep < 0 ? lines : lines.slice(0, sep)).join("\n");
  const paths = (sep < 0 ? [] : lines.slice(sep + 1)).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const { rules, sections, warnings } = parseCodeowners(file, o);
  if (rules.length === 0) return { output: "", error: { message: "No rules found in the CODEOWNERS text" } };
  const res = paths.map((p) => resolve(p, rules, o));
  const issues = o.lint ? [...warnings, ...lint(rules, res, o)] : [];
  // de-duplicate identical warnings
  const uniq = [...new Map(issues.map((w) => [`${w.line}|${w.msg}`, w])).values()].sort((a, b) => a.line - b.line);

  if (o.format === "json") {
    return {
      output: JSON.stringify(
        {
          rules: rules.map((r) => ({ line: r.line, pattern: r.pattern, owners: r.owners, section: r.section })),
          sections,
          paths: res.map((r) => ({ path: r.path, owners: r.owners, rule: r.wins.map((w) => ({ line: w.line, pattern: w.pattern, section: w.section })) })),
          warnings: uniq,
        },
        null,
        2,
      ),
      error: null,
    };
  }

  const out: string[] = [];
  out.push(`${rules.length} rule${rules.length === 1 ? "" : "s"}${sections.length ? `, ${sections.length} section${sections.length === 1 ? "" : "s"}` : ""}${paths.length ? `, ${paths.length} path${paths.length === 1 ? "" : "s"} tested` : ""}${o.lint ? `, ${uniq.length} warning${uniq.length === 1 ? "" : "s"}` : ""}`);
  if (paths.length === 0) out.push("", "Add a line containing only --- below the file, then one path per line, to see who owns them.");
  if (paths.length && o.view === "path") {
    const w = Math.min(60, Math.max(...res.map((r) => r.path.length), 4));
    out.push("", `${"PATH".padEnd(w)}  ${"OWNERS".padEnd(30)}  RULE`);
    for (const r of res) {
      const rule = r.wins.length ? r.wins.map((x) => `line ${x.line} ${x.pattern}${x.section ? ` [${x.section}]` : ""}`).join("; ") : "no matching rule";
      out.push(`${r.path.padEnd(w)}  ${(r.owners.length ? r.owners.join(" ") : "(no owner)").padEnd(30)}  ${rule}`);
    }
  }
  if (paths.length && o.view === "owner") {
    const by = new Map<string, string[]>();
    for (const r of res) for (const ow of r.owners.length ? r.owners : ["(no owner)"]) by.set(ow, [...(by.get(ow) ?? []), r.path]);
    out.push("");
    for (const [ow, ps] of [...by].sort((a, b) => a[0].localeCompare(b[0]))) out.push(`${ow} (${ps.length})`, ...ps.map((p) => "  " + p));
  }
  if (o.ruleUsage) {
    out.push("", "Rule usage" + (paths.length ? "" : " (no paths given)"));
    for (const r of rules) {
      const m = res.filter((x) => x.matched.includes(r)).length;
      const wn = res.filter((x) => x.wins.includes(r)).length;
      out.push(`  line ${String(r.line).padEnd(4)} ${r.pattern.padEnd(28)} ${r.owners.join(" ") || "(none)"}${paths.length ? `   wins ${wn}, matches ${m}` : ""}`);
    }
  }
  if (o.lint && uniq.length) out.push("", "Warnings", ...uniq.map((w) => `  line ${w.line}: ${w.msg}`));
  else if (o.lint && paths.length) out.push("", "No warnings");
  return { output: out.join("\n"), error: null };
}
