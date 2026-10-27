import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const mimeTypesTool: ToolRegistryEntry = {
  slug: "mime-types",
  name: "MIME Types Lookup",
  module: "network",
  description: "Look up the MIME type for a file extension — or the extensions for a content type.",
  aliases: ["content type lookup","file extension to mime","mime type list","media types"],
  icon: "FileType",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["content type lookup","file extension to mime","mime type list","media types"] },
};
