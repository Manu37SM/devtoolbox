import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const robotsTxtGeneratorTool: ToolRegistryEntry = {
  slug: "robots-txt-generator",
  name: "robots.txt Generator",
  module: "network",
  description: "Build a robots.txt with allow-all, block-all or sensible defaults, optionally block known AI training crawlers, add sitemaps and custom rules, and get lint warnings.",
  aliases: ["robots.txt","block ai crawlers","gptbot disallow","sitemap directive","crawl delay"],
  icon: "Bot",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["robots.txt","block ai crawlers","gptbot disallow","sitemap directive","crawl delay"] },
};
