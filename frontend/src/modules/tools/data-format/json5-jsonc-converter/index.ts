import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const json5JsoncConverterTool: ToolRegistryEntry = {
  slug: "json5-jsonc-converter",
  name: "JSON5 / JSONC ⇄ JSON Converter",
  module: "data-format",
  description: "Turn JSON5 or JSON-with-comments (tsconfig, VS Code settings) into strict JSON, or emit JSON5 with unquoted keys and trailing commas. Accurate line/column errors.",
  aliases: ["jsonc to json","strip json comments","tsconfig json","json5 parser","remove trailing commas json"],
  icon: "Braces",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["jsonc to json","strip json comments","tsconfig json","json5 parser","remove trailing commas json"] },
};
