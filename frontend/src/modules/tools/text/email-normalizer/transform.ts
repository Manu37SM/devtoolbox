import type { TransformResult } from "@/lib/tool-transform";
import type { EmailNormalizerOptions } from "./schema";

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string, options: EmailNormalizerOptions): string | null {
  const trimmed = email.trim();
  if (!EMAIL_PATTERN.test(trimmed)) return null;
  const at = trimmed.lastIndexOf("@");
  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1).toLowerCase();

  if (options.lowercase) local = local.toLowerCase();
  const isGmail = GMAIL_DOMAINS.has(domain);
  if (options.stripPlus === "all" || (options.stripPlus === "gmail" && isGmail)) {
    const plus = local.indexOf("+");
    if (plus > 0) local = local.slice(0, plus);
  }
  if (options.gmailDots && isGmail) {
    local = local.replace(/\./g, "");
    if (options.unifyGmailDomain) domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

export function normalizeEmails(input: string, options: EmailNormalizerOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of input.split(/\r?\n|[,;]/)) {
    if (line.trim() === "") continue;
    const normalized = normalizeEmail(line, options);
    if (normalized === null) {
      out.push(`# invalid: ${line.trim()}`);
      continue;
    }
    if (options.dedupe) {
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(normalized);
  }
  return { output: out.join("\n"), error: null };
}
