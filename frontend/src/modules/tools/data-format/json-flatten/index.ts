import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonFlattenTool: ToolRegistryEntry = {
  slug: "json-flatten",
  name: "JSON Flatten / Unflatten",
  module: "data-format",
  description: "Flatten nested JSON into dotted or bracketed paths (a.b[0].c) and unflatten them back, with a custom delimiter. Useful for i18n files, env vars and diffs.",
  aliases: ["flatten json","unflatten json","json to dot notation","json path keys","flat json"],
  icon: "ListTree",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["flatten json","unflatten json","json to dot notation","json path keys","flat json"] },
};
