import { describe, expect, it } from "vitest";
import { escapeXml, generateSitemap } from "./transform";

const base = { changefreq: "none" as const, priority: "none" as const, dedupe: true };

describe("generateSitemap", () => {
  it("builds a urlset with optional lastmod", () => {
    const r = generateSitemap("https://example.com/\nhttps://example.com/a 2024-02-29", base);
    expect(r.error).toBeNull();
    expect(r.output).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(r.output).toContain("<loc>https://example.com/</loc>");
    expect(r.output).toContain("<lastmod>2024-02-29</lastmod>");
    expect(r.output.match(/<lastmod>/g)).toHaveLength(1);
  });
  it("escapes XML special characters in URLs", () => {
    expect(generateSitemap("https://example.com/?a=1&b=2", base).output).toContain("?a=1&amp;b=2");
    expect(escapeXml(`<'"&>`)).toBe("&lt;&apos;&quot;&amp;&gt;");
  });
  it("applies changefreq and priority to every entry", () => {
    const r = generateSitemap("https://e.com/a\nhttps://e.com/b", { ...base, changefreq: "weekly", priority: "0.8" });
    expect(r.output.match(/<changefreq>weekly<\/changefreq>/g)).toHaveLength(2);
    expect(r.output.match(/<priority>0.8<\/priority>/g)).toHaveLength(2);
  });
  it("dedupes when asked", () => {
    expect(generateSitemap("https://e.com/a\nhttps://e.com/a", base).output.match(/<url>/g)).toHaveLength(1);
    expect(generateSitemap("https://e.com/a\nhttps://e.com/a", { ...base, dedupe: false }).output.match(/<url>/g)).toHaveLength(2);
  });
  it("reports errors with line numbers", () => {
    expect(generateSitemap("https://e.com/a\n/relative", base).error).toMatchObject({ line: 2 });
    expect(generateSitemap("ftp://e.com/a", base).error?.message).toMatch(/http/);
    expect(generateSitemap("https://e.com/a 2023-02-30", base).error?.message).toMatch(/lastmod/);
    expect(generateSitemap("https://e.com/a 2024-01-01 extra", base).error?.message).toMatch(/Expected/);
  });
  it("notes multiple hosts and handles empty input", () => {
    expect(generateSitemap("https://a.com/\nhttps://b.com/", base).output).toContain("2 hosts");
    expect(generateSitemap("  \n# c", base)).toEqual({ output: "", error: null });
  });
});
