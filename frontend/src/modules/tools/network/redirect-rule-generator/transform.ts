import type { TransformResult } from "@/lib/tool-transform";
import type { RedirectRuleGeneratorOptions } from "./schema";

export interface Rule { from: string; to: string; code: number }

const CODES = new Set([301, 302, 303, 307, 308]);

/** Each line: `<from-path> <to> [status]`. `from` must be a path starting with / (query strings are not matched by most servers). */
export function parseRules(input: string, defaultCode: number): Rule[] {
  const rules: Rule[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of input.split(/\r?\n/).entries()) {
    const line = raw.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2 || parts.length > 3) throw Object.assign(new Error('Expected "<from> <to> [status]"'), { line: i + 1 });
    const [from, to, codeText] = parts as [string, string, string | undefined];
    if (!from.startsWith("/")) throw Object.assign(new Error(`Source "${from}" must start with /`), { line: i + 1 });
    if (/[\s"'`;{}\\]/.test(from) || /["'`;{}\\]/.test(to)) throw Object.assign(new Error("Unsupported characters in rule (quotes, ;, {}, \\)"), { line: i + 1 });
    if (!/^(\/|https?:\/\/)/.test(to)) throw Object.assign(new Error(`Destination "${to}" must start with / or http(s)://`), { line: i + 1 });
    const code = codeText ? Number(codeText) : defaultCode;
    if (!CODES.has(code)) throw Object.assign(new Error(`Status ${codeText} is not a redirect code (301, 302, 303, 307, 308)`), { line: i + 1 });
    if (seen.has(from)) throw Object.assign(new Error(`Duplicate source "${from}"`), { line: i + 1 });
    if (from === to) throw Object.assign(new Error("Source and destination are identical (redirect loop)"), { line: i + 1 });
    seen.add(from);
    rules.push({ from, to, code });
  }
  return rules;
}


export function render(rules: Rule[], target: RedirectRuleGeneratorOptions["target"]): string {
  switch (target) {
    case "nginx":
      return rules.map((r) => `location = ${r.from} { return ${r.code} ${r.to}; }`).join("\n");
    case "apache":
      return ["# .htaccess (mod_alias)", ...rules.map((r) => `Redirect ${r.code} ${r.from} ${r.to}`)].join("\n");
    case "netlify":
      return ["# _redirects", ...rules.map((r) => `${r.from}  ${r.to}  ${r.code}`)].join("\n");
    case "vercel":
      return JSON.stringify({ redirects: rules.map((r) => ({ source: r.from, destination: r.to, permanent: r.code === 301 || r.code === 308, ...(r.code === 302 || r.code === 301 ? {} : { statusCode: r.code }) })) }, null, 2).replace(/"permanent": (true|false),\n\s+"statusCode": (\d+)/g, '"statusCode": $2');
    case "caddy":
      return rules.map((r) => `redir ${r.from} ${r.to} ${r.code}`).join("\n");
    case "cloudflare":
      return ["# Cloudflare Bulk Redirects CSV: source,target,status", ...rules.map((r) => `${r.from},${r.to},${r.code}`)].join("\n");
  }
}

export function generateRedirects(input: string, o: RedirectRuleGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  try {
    const rules = parseRules(input, Number(o.defaultCode));
    if (!rules.length) return { output: "", error: null };
    const notes: string[] = [];
    const froms = new Set(rules.map((r) => r.from));
    for (const r of rules) if (froms.has(r.to) && r.to !== r.from) notes.push(`Chain: ${r.from} → ${r.to} → ${rules.find((x) => x.from === r.to)!.to} (point ${r.from} straight at the final URL)`);
    const body = render(rules, o.target);
    const comment = o.target === "vercel" || o.target === "cloudflare" ? "" : notes.map((n) => `# ${n}`).join("\n");
    return { output: [body, comment].filter(Boolean).join("\n") + (o.target === "vercel" && notes.length ? `\n\n${notes.join("\n")}` : ""), error: null };
  } catch (e) {
    const line = (e as { line?: number }).line;
    return { output: "", error: { message: (e as Error).message, ...(line ? { line } : {}) } };
  }
}
