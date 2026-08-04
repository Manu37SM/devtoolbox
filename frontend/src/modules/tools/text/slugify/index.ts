import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const slugifyTool: ToolRegistryEntry = {
  slug: "slugify",
  name: "Slugify",
  module: "text",
  description: "Convert text into URL-safe slugs, one line at a time.",
  aliases: ["url slug generator", "slug maker"],
  icon: "Link",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["slugify text", "url slug generator", "convert title to slug"] },
};
