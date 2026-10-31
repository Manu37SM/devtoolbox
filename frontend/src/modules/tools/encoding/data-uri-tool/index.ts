import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dataUriToolTool: ToolRegistryEntry = {
  slug: "data-uri-tool",
  name: "Data URI Builder & Parser",
  module: "encoding",
  description: "Build data: URIs from text with a chosen MIME type, base64 or percent encoding and charset, or parse a data URI back into its type, parameters and decoded content.",
  aliases: ["data url", "data uri generator", "base64 data uri", "decode data uri", "inline svg css", "rfc 2397"],
  icon: "Link",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["data uri builder & parser", "data url", "data uri generator", "base64 data uri", "decode data uri", "inline svg css", "rfc 2397"] },
};
