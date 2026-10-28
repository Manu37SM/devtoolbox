import type { TransformResult } from "@/lib/tool-transform";
import type { RobotsTxtGeneratorOptions } from "./schema";

export const AI_CRAWLERS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "CCBot", "PerplexityBot", "Bytespider", "Amazonbot", "Applebot-Extended", "Meta-ExternalAgent", "cohere-ai", "Diffbot"];

const PRESETS: Record<RobotsTxtGeneratorOptions["preset"], string[]> = {
  "allow-all": ["Allow: /"],
  "block-all": ["Disallow: /"],
  standard: ["Disallow: /admin/", "Disallow: /api/", "Disallow: /login", "Disallow: /cart", "Disallow: /checkout", "Disallow: /search"],
};

const DIRECTIVE = /^(user-agent|allow|disallow|crawl-delay|sitemap|host)\s*:\s*(.*)$/i;

export function lintRobots(lines: string[]): string[] {
  const w: string[] = [];
  let inGroup = false;
  lines.forEach((l, i) => {
    const m = DIRECTIVE.exec(l);
    if (!m) return;
    const d = m[1]!.toLowerCase();
    const v = m[2]!.trim();
    if (d === "user-agent") inGroup = true;
    else if ((d === "allow" || d === "disallow" || d === "crawl-delay") && !inGroup) w.push(`Line ${i + 1}: "${m[1]}" appears before any User-agent line.`);
    if ((d === "allow" || d === "disallow") && v && !v.startsWith("/") && !v.startsWith("*")) w.push(`Line ${i + 1}: path "${v}" should start with "/" or "*".`);
    if (d === "sitemap" && !/^https?:\/\/\S+$/i.test(v)) w.push(`Line ${i + 1}: Sitemap must be an absolute http(s) URL.`);
    if (d === "crawl-delay") w.push(`Line ${i + 1}: Crawl-delay is ignored by Google; Bing and Yandex honour it.`);
    if (d === "host") w.push(`Line ${i + 1}: Host is a Yandex-only directive.`);
  });
  return [...new Set(w)];
}

export function generateRobots(input: string, options: RobotsTxtGeneratorOptions): TransformResult {
  const extras = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const bad = extras.filter((l) => !DIRECTIVE.test(l));
  if (bad.length) return { output: "", error: { message: `Not a robots.txt directive: "${bad[0]}" (use Allow:, Disallow:, Sitemap:, Crawl-delay:, User-agent:)` } };
  const sitemaps = extras.filter((l) => /^sitemap/i.test(l)).map((l) => "Sitemap: " + DIRECTIVE.exec(l)![2]!.trim());
  const rest = extras.filter((l) => !/^sitemap/i.test(l));
  const hasOwnAgents = rest.some((l) => /^user-agent/i.test(l));
  const out: string[] = [];
  if (options.blockAiCrawlers) {
    for (const bot of AI_CRAWLERS) out.push(`User-agent: ${bot}`);
    out.push("Disallow: /", "");
  }
  if (!hasOwnAgents) {
    out.push("User-agent: *", ...PRESETS[options.preset], ...rest);
    if (options.crawlDelay > 0 && !rest.some((l) => /^crawl-delay/i.test(l))) out.push(`Crawl-delay: ${options.crawlDelay}`);
  } else {
    out.push(...PRESETS[options.preset].length && !rest.some((l) => /^user-agent:\s*\*/i.test(l)) ? ["User-agent: *", ...PRESETS[options.preset], ""] : []);
    for (const l of rest) {
      if (/^user-agent/i.test(l) && out.length && out[out.length - 1] !== "") out.push("");
      out.push(l);
    }
  }
  if (sitemaps.length) out.push("", ...sitemaps);
  const text = out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  const warnings = lintRobots(text.split("\n"));
  const suffix = warnings.length ? `\n# Notes (remove before deploying):\n${warnings.map((x) => `# - ${x}`).join("\n")}\n` : "";
  return { output: text + suffix, error: null };
}
