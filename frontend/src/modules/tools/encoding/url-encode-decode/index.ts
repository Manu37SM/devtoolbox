import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const urlEncodeDecodeTool: ToolRegistryEntry = {
  slug: "url-encode-decode",
  name: "URL Encode/Decode",
  module: "encoding",
  description: "Percent-encode or decode URLs and query string components.",
  aliases: ["url encoder", "url decoder", "percent encoding", "uri encode"],
  icon: "Link",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["url encode", "url decode", "percent encoding online"] },
};
