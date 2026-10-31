import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const rssAtomFeedGeneratorTool: ToolRegistryEntry = {
  slug: "rss-atom-feed-generator",
  name: "RSS / Atom / JSON Feed Generator",
  module: "generators",
  description: "Build an RSS 2.0, Atom 1.0 or JSON Feed 1.1 document from simple channel and item lines, with correct date formats, escaping, CDATA content, enclosures, categories and self links.",
  aliases: ["rss generator", "atom feed", "json feed", "podcast feed", "feed xml", "syndication"],
  icon: "Rss",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["rss / atom / json feed generator", "rss generator", "atom feed", "json feed", "podcast feed", "feed xml", "syndication"] },
};
