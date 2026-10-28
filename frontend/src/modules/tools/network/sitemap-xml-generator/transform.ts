import type { TransformResult } from "@/lib/tool-transform";
import type { SitemapXmlGeneratorOptions } from "./schema";

export const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const W3C_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

function validDate(d: string): boolean {
  if (!W3C_DATE.test(d)) return false;
  const [y, m, day] = d.slice(0, 10).split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === day;
}

/** One URL per line, optionally followed by whitespace and a lastmod date (YYYY-MM-DD or W3C datetime). */
export function generateSitemap(input: string, options: SitemapXmlGeneratorOptions): TransformResult {
  const lines = input.split(/\r?\n/);
  const entries: { loc: string; lastmod?: string }[] = [];
  const seen = new Set<string>();
  const hosts = new Set<string>();
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [loc, lastmod, ...rest] = line.split(/\s+/);
    if (rest.length) return { output: "", error: { message: "Expected: URL [lastmod]", line: i + 1 } };
    let u: URL;
    try { u = new URL(loc!); } catch { return { output: "", error: { message: `Invalid URL "${loc}" (must be absolute, e.g. https://example.com/page)`, line: i + 1 } }; }
    if (u.protocol !== "http:" && u.protocol !== "https:") return { output: "", error: { message: "Only http and https URLs are allowed", line: i + 1 } };
    if (lastmod !== undefined && !validDate(lastmod)) return { output: "", error: { message: `Invalid lastmod "${lastmod}"; use YYYY-MM-DD or a W3C datetime`, line: i + 1 } };
    if (loc!.length >= 2048) return { output: "", error: { message: "URL is longer than 2,048 characters", line: i + 1 } };
    if (options.dedupe) { if (seen.has(loc!)) continue; seen.add(loc!); }
    hosts.add(u.host);
    entries.push({ loc: loc!, lastmod });
  }
  if (!entries.length) return { output: "", error: null };
  if (entries.length > 50_000) return { output: "", error: { message: `${entries.length} URLs exceeds the 50,000 per sitemap limit; split into several sitemaps and a sitemap index` } };
  const rows = entries.map((e) => {
    const parts = [`    <loc>${escapeXml(e.loc)}</loc>`];
    if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
    if (options.changefreq !== "none") parts.push(`    <changefreq>${options.changefreq}</changefreq>`);
    if (options.priority !== "none") parts.push(`    <priority>${options.priority}</priority>`);
    return `  <url>\n${parts.join("\n")}\n  </url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
  const bytes = new TextEncoder().encode(xml).length;
  if (bytes > 52_428_800) return { output: "", error: { message: "Sitemap exceeds the 50 MB uncompressed limit; split it" } };
  const notes = hosts.size > 1 ? `<!-- Note: URLs span ${hosts.size} hosts; a sitemap may only list URLs on the host it is served from -->\n` : "";
  return { output: notes + xml, error: null };
}
