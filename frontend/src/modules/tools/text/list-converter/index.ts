import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const listConverterTool: ToolRegistryEntry = {
  slug: "list-converter",
  name: "List Converter",
  module: "text",
  description: "Turn lines into comma lists, quoted lists, SQL IN (…) clauses or JSON arrays — and back. Splits Oracle IN lists over 1000 items.",
  aliases: ["lines to comma separated","sql in list","column to list","csv list builder","oracle in clause"],
  icon: "ListOrdered",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["lines to comma separated","sql in list","column to list","csv list builder","oracle in clause"] },
};
