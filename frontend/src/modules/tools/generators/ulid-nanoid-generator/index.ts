import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ulidNanoidGeneratorTool: ToolRegistryEntry = {
  slug: "ulid-nanoid-generator",
  name: "ULID / NanoID Generator",
  module: "generators",
  description: "Generate time-sortable ULIDs and compact URL-safe NanoIDs, or decode a ULID's timestamp.",
  aliases: ["ulid generator","nanoid generator","decode ulid","sortable unique id"],
  icon: "Hash",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ulid generator","nanoid generator","decode ulid","sortable unique id"] },
};
