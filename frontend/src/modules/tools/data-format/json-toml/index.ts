import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonTomlTool: ToolRegistryEntry = {
  slug: "json-toml",
  name: "JSON ↔ TOML Converter",
  module: "data-format",
  description: "Convert between JSON and TOML formats, in either direction, entirely client-side.",
  aliases: ["json to toml", "toml to json", "toml converter"],
  icon: "FileCode",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["json to toml", "toml to json", "json toml converter", "toml formatter"],
  },
};
