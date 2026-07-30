import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const htmlEntityTool: ToolRegistryEntry = {
  slug: "html-entity",
  name: "HTML Entity Encode/Decode",
  module: "encoding",
  description: "Escape HTML-reserved characters to entities, or decode entities back to text.",
  aliases: ["html escape", "html entity encoder", "html entity decoder"],
  icon: "Code2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["html entity encoder", "html entity decoder", "html escape online"] },
};
