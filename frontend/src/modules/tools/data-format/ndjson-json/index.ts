import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ndjsonJsonTool: ToolRegistryEntry = {
  slug: "ndjson-json",
  name: "NDJSON ↔ JSON Array",
  module: "data-format",
  description: "Convert JSON Lines (NDJSON) to a JSON array and back, reporting the exact failing line.",
  aliases: ["jsonl to json","json lines converter","ndjson to array","jsonl"],
  icon: "Rows3",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["jsonl to json","json lines converter","ndjson to array","jsonl"] },
};
