import type { TransformResult } from "@/lib/tool-transform";
import type { SecretScannerOptions } from "./schema";

interface Rule { id: string; name: string; severity: "high" | "medium" | "low"; re: RegExp; generic?: boolean }

export const RULES: Rule[] = [
  { id: "aws-access-key", name: "AWS access key ID", severity: "high", re: /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g },
  { id: "github-token", name: "GitHub token", severity: "high", re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b/g },
  { id: "gitlab-token", name: "GitLab personal access token", severity: "high", re: /\bglpat-[A-Za-z0-9_-]{20}\b/g },
  { id: "slack-token", name: "Slack token", severity: "high", re: /\bxox[abprs]-[A-Za-z0-9-]{10,72}\b/g },
  { id: "slack-webhook", name: "Slack webhook URL", severity: "medium", re: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g },
  { id: "stripe-live", name: "Stripe live secret key", severity: "high", re: /\b[sr]k_live_[A-Za-z0-9]{20,99}\b/g },
  { id: "google-api-key", name: "Google API key", severity: "medium", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "sendgrid", name: "SendGrid API key", severity: "high", re: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g },
  { id: "npm-token", name: "npm access token", severity: "high", re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { id: "anthropic-key", name: "Anthropic API key", severity: "high", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { id: "openai-key", name: "OpenAI-style API key", severity: "high", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g },
  { id: "private-key", name: "Private key block", severity: "high", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/g },
  { id: "jwt", name: "JSON Web Token", severity: "medium", re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
  { id: "basic-auth-url", name: "Credentials in URL", severity: "high", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s:@/]{3,}@[^\s/]+/gi },
  { id: "generic-secret", name: "Hard-coded secret assignment", severity: "low", generic: true, re: /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\b["']?\s*[:=]\s*["']([^"'\s]{8,})["']/gi },
];

const PLACEHOLDER = /^(?:x+|\*+|changeme|change_me|your[_-].*|<.*>|\$\{.*\}|\{\{.*\}\}|example.*|dummy.*|password|secret|test.*)$/i;

export interface Finding { rule: Rule; line: number; match: string; value: string }

export function mask(v: string): string {
  if (v.length <= 8) return "*".repeat(v.length);
  return v.slice(0, 4) + "…" + "*".repeat(Math.min(v.length - 8, 12)) + "…" + v.slice(-2) + ` (${v.length} chars)`;
}

export function scan(text: string, includeGeneric: boolean): Finding[] {
  const found: Finding[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((l, i) => {
    for (const rule of RULES) {
      if (rule.generic && !includeGeneric) continue;
      for (const m of l.matchAll(new RegExp(rule.re.source, rule.re.flags))) {
        const value = m[1] ?? m[0];
        if (rule.generic && PLACEHOLDER.test(value)) continue;
        if (rule.id === "basic-auth-url" && /:\/\/[^:]+:(?:password|pass|secret|\*+|x+)@/i.test(m[0])) continue;
        found.push({ rule, line: i + 1, match: m[0], value });
      }
    }
  });
  return found;
}

export function runSecretScanner(input: string, o: SecretScannerOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const f = scan(input, o.includeGeneric);
  if (!f.length) return { output: "✓ No known secret patterns found.\n\nThis checks well-known token formats only. It cannot prove a file is clean.", error: null };
  const order = { high: 0, medium: 1, low: 2 };
  f.sort((a, b) => order[a.rule.severity] - order[b.rule.severity] || a.line - b.line);
  const out = [`${f.length} potential secret${f.length === 1 ? "" : "s"} found:`, ""];
  for (const x of f) out.push(`[${x.rule.severity.toUpperCase()}] line ${x.line}: ${x.rule.name}`, `    ${o.revealValues ? x.value : mask(x.value)}`);
  out.push("", "If any of these are real: revoke and rotate them first, then remove them from history (git filter-repo / BFG). Deleting the line is not enough.");
  return { output: out.join("\n"), error: null };
}
