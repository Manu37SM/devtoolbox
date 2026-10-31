import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonLdGeneratorTool: ToolRegistryEntry = {
  slug: "json-ld-generator",
  name: "JSON-LD Structured Data Generator",
  module: "generators",
  description: "Build schema.org JSON-LD for articles, products, businesses, events, recipes, jobs, videos, breadcrumbs and more from simple property lines, with nesting, enum shorthands and required-property checks.",
  aliases: ["json-ld", "schema.org", "structured data", "rich results", "jsonld generator", "seo markup"],
  icon: "Braces",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json-ld structured data generator", "json-ld", "schema.org", "structured data", "rich results", "jsonld generator", "seo markup"] },
};
