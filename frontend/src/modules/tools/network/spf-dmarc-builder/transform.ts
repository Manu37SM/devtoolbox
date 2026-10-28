import type { TransformResult } from "@/lib/tool-transform";
import type { SpfDmarcBuilderOptions } from "./schema";

const SPF_LOOKUP = new Set(["include", "a", "mx", "ptr", "exists", "redirect"]);
const SPF_KINDS = new Set(["include", "a", "mx", "ptr", "exists", "redirect", "ip4", "ip6", "exp"]);

function cleanLines(input: string): string[] {
  return input.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim()).filter(Boolean);
}

const IPV4_CIDR = /^(\d{1,3})(\.\d{1,3}){3}(\/(\d|[12]\d|3[0-2]))?$/;
const IPV6ISH = /^[0-9a-fA-F:.]+(\/\d{1,3})?$/;
const HOST = /^(?=.{1,253}$)([a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?\.)+[a-z]{2,}$/i;

export function buildSpf(lines: string[], all: string): { record: string; lookups: number; warnings: string[] } {
  const warnings: string[] = [];
  const terms: string[] = [];
  let lookups = 0;
  for (const raw of lines) {
    const line = raw.replace(/^v=spf1\s*/i, "").trim();
    for (const t of line.split(/\s+/).filter(Boolean)) {
      if (/^[-~?+]?all$/i.test(t)) { warnings.push(`Ignored "${t}": the all mechanism is set with the option, not in the list`); continue; }
      const m = /^([-~?+]?)([a-z0-9]+)(?:([:=])(.+))?$/i.exec(t);
      if (!m) throw new Error(`Cannot parse "${t}"`);
      const kind = m[2]!.toLowerCase();
      const val = m[4];
      if (!SPF_KINDS.has(kind) && !["a", "mx", "ptr"].includes(kind)) throw new Error(`Unknown SPF mechanism "${kind}"`);
      if (kind === "ip4" && !(val && IPV4_CIDR.test(val))) throw new Error(`Invalid ip4 value "${val ?? ""}"`);
      if (kind === "ip6" && !(val && IPV6ISH.test(val) && val.includes(":"))) throw new Error(`Invalid ip6 value "${val ?? ""}"`);
      if ((kind === "include" || kind === "redirect" || kind === "exists" || kind === "exp") && !(val && HOST.test(val.replace(/%\{[^}]+\}/g, "x.")))) throw new Error(`${kind} needs a domain, got "${val ?? ""}"`);
      if (kind === "ptr") warnings.push("ptr is deprecated (RFC 7208) and slow; prefer ip4/ip6 or include");
      if (SPF_LOOKUP.has(kind)) lookups++;
      terms.push(t);
    }
  }
  const redirect = terms.some((t) => t.startsWith("redirect="));
  const record = ["v=spf1", ...terms.filter((t) => t.startsWith("redirect=") === false), ...(redirect ? [] : [all]), ...terms.filter((t) => t.startsWith("redirect="))].join(" ");
  if (redirect && all !== "~all") warnings.push("redirect= replaces the all mechanism, so the chosen all qualifier is not used");
  if (lookups > 10) warnings.push(`${lookups} DNS-lookup terms exceed the SPF limit of 10 (RFC 7208 §4.6.4); receivers will return permerror. Includes may add more lookups of their own.`);
  else if (lookups > 7) warnings.push(`${lookups} DNS-lookup terms; included records add more, so you may be close to the limit of 10`);
  if (all === "+all") warnings.push("+all allows every sender and defeats SPF");
  if (record.length > 255) warnings.push(`Record is ${record.length} characters; a TXT string is limited to 255, so it must be split into multiple quoted strings (most DNS hosts do this automatically)`);
  if (record.length > 450) warnings.push("Over ~450 characters the response may not fit in a UDP DNS packet");
  return { record, lookups, warnings };
}

export function buildDmarc(lines: string[], policy: string, pct: number): { record: string; warnings: string[] } {
  const warnings: string[] = [];
  const tags: string[] = [`v=DMARC1`, `p=${policy}`];
  const seen = new Set<string>(["v", "p"]);
  const allowed = new Set(["rua", "ruf", "sp", "adkim", "aspf", "fo", "rf", "ri"]);
  for (const l of lines) {
    const m = /^([a-z]+)\s*[=:]\s*(.+)$/i.exec(l);
    if (!m) throw new Error(`Expected key=value, got "${l}"`);
    const k = m[1]!.toLowerCase();
    const v = m[2]!.trim();
    if (k === "v" || k === "p" || k === "pct") { warnings.push(`"${k}" is set with the options and was ignored in the list`); continue; }
    if (!allowed.has(k)) throw new Error(`Unknown DMARC tag "${k}"`);
    if (seen.has(k)) throw new Error(`Duplicate tag "${k}"`);
    seen.add(k);
    if ((k === "rua" || k === "ruf")) {
      for (const u of v.split(",")) if (!/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+(![0-9]+[kmgt]?)?$/i.test(u.trim())) throw new Error(`${k} must be mailto: URIs, got "${u.trim()}"`);
    }
    if (k === "sp" && !["none", "quarantine", "reject"].includes(v)) throw new Error(`sp must be none, quarantine or reject`);
    if ((k === "adkim" || k === "aspf") && !["r", "s"].includes(v)) throw new Error(`${k} must be r or s`);
    if (k === "ri" && !/^\d+$/.test(v)) throw new Error("ri must be a number of seconds");
    tags.push(`${k}=${v}`);
  }
  if (pct !== 100) tags.splice(2, 0, `pct=${pct}`);
  if (!seen.has("rua")) warnings.push("No rua= address: you will not receive aggregate reports, which you need to move safely from p=none to enforcement");
  if (policy === "none") warnings.push("p=none only monitors; it does not block spoofed mail");
  if (pct !== 100 && policy === "none") warnings.push("pct has no effect with p=none");
  return { record: tags.join("; "), warnings };
}

export function runSpfDmarc(input: string, options: SpfDmarcBuilderOptions): TransformResult {
  const lines = cleanLines(input);
  try {
    if (options.record === "spf") {
      if (!lines.length) return { output: "", error: null };
      const r = buildSpf(lines, options.spfAll);
      const out = [`Host:  @   (your domain)`, `Type:  TXT`, `Value: ${r.record}`, "", `DNS lookups used by listed terms: ${r.lookups} / 10`];
      if (r.warnings.length) out.push("", ...r.warnings.map((w) => `⚠ ${w}`));
      return { output: out.join("\n"), error: null };
    }
    const r = buildDmarc(lines, options.dmarcPolicy, options.dmarcPct);
    const out = [`Host:  _dmarc   (i.e. _dmarc.yourdomain.com)`, `Type:  TXT`, `Value: ${r.record}`];
    if (r.warnings.length) out.push("", ...r.warnings.map((w) => `⚠ ${w}`));
    return { output: out.join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
