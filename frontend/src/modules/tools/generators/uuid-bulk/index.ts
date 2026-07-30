import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const uuidBulkTool: ToolRegistryEntry = {
  slug: "uuid-bulk-generator",
  name: "GUID/UUID Bulk Generator",
  module: "generators",
  description: "Generate up to 10,000 UUIDs at once, exportable as a list, JSON array, or CSV.",
  aliases: ["bulk uuid generator", "guid bulk generator", "mass uuid generator"],
  icon: "ListPlus",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["bulk uuid generator", "generate multiple uuids", "guid list generator"] },
};
