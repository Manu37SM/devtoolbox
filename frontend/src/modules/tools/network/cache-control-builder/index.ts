import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cacheControlBuilderTool: ToolRegistryEntry = {
  slug: "cache-control-builder",
  name: "Cache-Control Header Builder",
  module: "network",
  description: "Build or explain Cache-Control headers: max-age, s-maxage, stale-while-revalidate, immutable and more, with plain-English meaning, contradiction warnings and Nginx/Apache/Express snippets.",
  aliases: ["http caching","max-age s-maxage","stale-while-revalidate","immutable assets header","cache header explainer"],
  icon: "Gauge",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["http caching","max-age s-maxage","stale-while-revalidate","immutable assets header","cache header explainer"] },
};
