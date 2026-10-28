import { describe, expect, it } from "vitest";
import { AI_CRAWLERS, generateRobots, lintRobots } from "./transform";

const o = { preset: "standard", blockAiCrawlers: false, crawlDelay: 0 } as const;

describe("generateRobots", () => {
  it("builds the allow-all and block-all presets", () => {
    expect(generateRobots("", { ...o, preset: "allow-all" }).output).toBe("User-agent: *\nAllow: /\n");
    expect(generateRobots("", { ...o, preset: "block-all" }).output).toBe("User-agent: *\nDisallow: /\n");
  });
  it("adds extra rules and sitemaps", () => {
    const r = generateRobots("Disallow: /tmp/\nsitemap: https://example.com/sitemap.xml", o).output;
    expect(r).toContain("User-agent: *\nDisallow: /admin/");
    expect(r).toContain("Disallow: /tmp/");
    expect(r.trim().endsWith("Sitemap: https://example.com/sitemap.xml")).toBe(true);
  });
  it("blocks AI crawlers in their own group", () => {
    const r = generateRobots("", { ...o, preset: "allow-all", blockAiCrawlers: true }).output;
    expect(r.startsWith("User-agent: GPTBot\n")).toBe(true);
    for (const bot of AI_CRAWLERS) expect(r).toContain(`User-agent: ${bot}\n`);
    expect(r).toContain("Disallow: /\n\nUser-agent: *\nAllow: /");
  });
  it("respects user-supplied user-agent groups and crawl delay", () => {
    const r = generateRobots("User-agent: Googlebot\nDisallow: /nogoogle/", { ...o, preset: "allow-all" }).output;
    expect(r).toContain("User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nDisallow: /nogoogle/");
    expect(generateRobots("", { ...o, crawlDelay: 10 }).output).toContain("Crawl-delay: 10");
  });
  it("rejects non-directives and lints", () => {
    expect(generateRobots("hello world", o).error?.message).toContain("Not a robots.txt directive");
    expect(lintRobots(["Disallow: /a"])[0]).toContain("before any User-agent");
    expect(lintRobots(["User-agent: *", "Disallow: admin"])[0]).toContain('should start with "/"');
    expect(lintRobots(["User-agent: *", "Sitemap: /x.xml"])[0]).toContain("absolute");
  });
});
