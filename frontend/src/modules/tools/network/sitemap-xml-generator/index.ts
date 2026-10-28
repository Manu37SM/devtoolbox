import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sitemapXmlGeneratorTool: ToolRegistryEntry = {
  slug: "sitemap-xml-generator",
  name: "XML Sitemap Generator",
  module: "network",
  description: "Turn a list of URLs (with optional lastmod dates) into a valid sitemap.xml: proper escaping, duplicate removal, changefreq and priority, and the 50,000 URL limit check.",
  aliases: ["sitemap.xml","create sitemap","urls to sitemap","seo sitemap","sitemap protocol"],
  icon: "Map",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["sitemap.xml","create sitemap","urls to sitemap","seo sitemap","sitemap protocol"] },
};
