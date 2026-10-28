import type { TransformResult } from "@/lib/tool-transform";
import type { UtmLinkBuilderOptions } from "./schema";

const KNOWN = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id"];
const ALIASES: Record<string, string> = { source: "utm_source", medium: "utm_medium", campaign: "utm_campaign", term: "utm_term", content: "utm_content", id: "utm_id" };

export function normalizeValue(v: string, o: UtmLinkBuilderOptions): string {
  let s = v.trim();
  if (o.lowercase) s = s.toLowerCase();
  if (o.spaces === "underscore") s = s.replace(/\s+/g, "_");
  else if (o.spaces === "hyphen") s = s.replace(/\s+/g, "-");
  return s;
}

export function buildUtmLinks(input: string, options: UtmLinkBuilderOptions): TransformResult {
  const urls: string[] = [];
  const params = new Map<string, string>();
  const problems: string[] = [];
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(line) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(line) && !line.includes("=") ) { urls.push(line); continue; }
    const m = /^([A-Za-z_]+)\s*[:=]\s*(.+)$/.exec(line);
    if (!m) { problems.push(`Cannot read line: ${line}`); continue; }
    const key = ALIASES[m[1]!.toLowerCase()] ?? m[1]!.toLowerCase();
    if (!key.startsWith("utm_")) { problems.push(`Unknown parameter "${m[1]}" (use source, medium, campaign, term, content or id)`); continue; }
    params.set(key, normalizeValue(m[2]!, options));
  }
  if (!urls.length && !params.size) return { output: "", error: null };
  if (!urls.length) return { output: "", error: { message: "Add at least one URL (one per line)" } };
  for (const need of ["utm_source", "utm_medium", "utm_campaign"]) if (!params.has(need)) problems.push(`Missing ${need} (required by GA4 campaign reports)`);
  const out: string[] = [];
  for (const u of urls) {
    try {
      const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : `https://${u}`);
      const ordered = [...KNOWN.filter((k) => params.has(k)), ...[...params.keys()].filter((k) => !KNOWN.includes(k))];
      for (const k of ordered) {
        if (options.overwrite || !url.searchParams.has(k)) url.searchParams.set(k, params.get(k)!);
      }
      let s = url.toString();
      if (options.spaces !== "encode") s = s.replace(/%2C/g, ",");
      out.push(s);
    } catch {
      problems.push(`Invalid URL: ${u}`);
    }
  }
  return { output: out.join("\n"), error: problems.length ? { message: problems[0]! + (problems.length > 1 ? ` (+${problems.length - 1} more)` : "") } : null };
}
