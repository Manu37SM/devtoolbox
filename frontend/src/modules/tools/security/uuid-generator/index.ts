import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const uuidGeneratorTool: ToolRegistryEntry = {
  slug: "uuid-generator",
  name: "UUID Generator",
  module: "security",
  description: "Generate and inspect v4/v7 UUIDs in bulk, entirely client-side.",
  aliases: ["guid generator", "uuid v4 generator", "random uuid"],
  icon: "Hash",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["uuid generator", "guid generator", "uuid v4 online"] },
};
