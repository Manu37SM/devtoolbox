import type { TransformResult } from "@/lib/tool-transform";
import type { CacheControlBuilderOptions } from "./schema";

export function humanSeconds(s: number): string {
  if (s === 0) return "0 seconds";
  const units: Array<[string, number]> = [["year", 31536000], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
  const parts: string[] = [];
  for (const [n, size] of units) {
    const q = Math.floor(s / size);
    if (q) { parts.push(`${q} ${n}${q === 1 ? "" : "s"}`); s -= q * size; }
  }
  return parts.join(" ");
}

const EXPLAIN: Record<string, (v?: string) => string> = {
  public: () => "any cache (browser, CDN, proxy) may store the response",
  private: () => "only the end user's browser may store it — shared caches must not",
  "max-age": (v) => `fresh for ${humanSeconds(Number(v))} in any cache`,
  "s-maxage": (v) => `shared caches (CDN) treat it as fresh for ${humanSeconds(Number(v))}, overriding max-age`,
  "no-cache": () => "may be stored, but must be revalidated with the server before every reuse",
  "no-store": () => "must not be stored anywhere",
  "must-revalidate": () => "once stale, must not be served without successful revalidation",
  "proxy-revalidate": () => "like must-revalidate, but only for shared caches",
  immutable: () => "will not change while fresh — browsers skip revalidation on reload",
  "no-transform": () => "intermediaries must not modify the body (e.g. image recompression)",
  "stale-while-revalidate": (v) => `may serve a stale copy for up to ${humanSeconds(Number(v))} while refreshing in the background`,
  "stale-if-error": (v) => `may serve a stale copy for up to ${humanSeconds(Number(v))} if the origin errors`,
};

export function parseCacheControl(header: string): Array<[string, string | undefined]> {
  return header
    .replace(/^cache-control:\s*/i, "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const [k, ...v] = d.split("=");
      return [k!.trim().toLowerCase(), v.length ? v.join("=").trim().replace(/^"|"$/g, "") : undefined];
    });
}

export function buildDirectives(o: CacheControlBuilderOptions): string[] {
  const d: string[] = [];
  if (o.noStore) d.push("no-store");
  if (o.visibility !== "unspecified" && !o.noStore) d.push(o.visibility);
  if (o.noCache) d.push("no-cache");
  if (!o.noStore) {
    if (!o.noCache || o.maxAge > 0) d.push(`max-age=${o.maxAge}`);
    if (o.sMaxAge >= 0) d.push(`s-maxage=${o.sMaxAge}`);
    if (o.staleWhileRevalidate > 0) d.push(`stale-while-revalidate=${o.staleWhileRevalidate}`);
    if (o.staleIfError > 0) d.push(`stale-if-error=${o.staleIfError}`);
    if (o.mustRevalidate) d.push("must-revalidate");
    if (o.immutable) d.push("immutable");
  }
  if (o.noTransform) d.push("no-transform");
  return d;
}

export function review(dirs: Array<[string, string | undefined]>): string[] {
  const has = (k: string) => dirs.some(([n]) => n === k);
  const val = (k: string) => dirs.find(([n]) => n === k)?.[1];
  const w: string[] = [];
  if (has("no-store") && (has("max-age") || has("public") || has("immutable"))) w.push("no-store makes max-age/public/immutable pointless — nothing is cached.");
  if (has("public") && has("private")) w.push("public and private contradict each other.");
  if (has("no-cache") && has("immutable")) w.push("no-cache forces revalidation, which defeats immutable.");
  if (has("immutable") && Number(val("max-age") ?? 0) < 86400) w.push("immutable is meant for fingerprinted assets with a long max-age (e.g. 31536000).");
  if (has("s-maxage") && has("private")) w.push("s-maxage is ignored with private (shared caches may not store it).");
  if (has("stale-while-revalidate") && !has("max-age") && !has("s-maxage")) w.push("stale-while-revalidate only matters once the response has a freshness lifetime.");
  if (Number(val("max-age") ?? 0) > 31536000) w.push("max-age above one year is capped by most clients.");
  if (!dirs.length) w.push("Empty header — caches fall back to heuristic freshness.");
  return w;
}

export function buildCacheControl(input: string, options: CacheControlBuilderOptions): TransformResult {
  const existing = input.trim();
  const dirs: Array<[string, string | undefined]> = existing ? parseCacheControl(existing) : buildDirectives(options).map((d) => { const [k, v] = d.split("="); return [k!, v] as [string, string | undefined]; });
  const header = dirs.map(([k, v]) => (v === undefined ? k : `${k}=${v}`)).join(", ");
  const lines = [`Cache-Control: ${header}`, "", existing ? "Parsed from the header you pasted:" : "Built from the options:"];
  for (const [k, v] of dirs) lines.push(`  ${k}${v !== undefined ? "=" + v : ""} — ${EXPLAIN[k] ? EXPLAIN[k]!(v) : "unrecognised directive (ignored by most caches)"}`);
  const w = review(dirs);
  if (w.length) lines.push("", ...w.map((x) => `⚠ ${x}`));
  lines.push("", "Nginx:   add_header Cache-Control \"" + header + "\" always;", "Apache:  Header set Cache-Control \"" + header + "\"", "Express: res.set('Cache-Control', '" + header + "');", "Spring:  response.setHeader(\"Cache-Control\", \"" + header + "\");");
  return { output: lines.join("\n"), error: null };
}
