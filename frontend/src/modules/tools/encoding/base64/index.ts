import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const base64Tool: ToolRegistryEntry = {
  slug: "base64",
  name: "Base64 Encode/Decode",
  module: "encoding",
  description: "Encode text to Base64 or decode Base64 back to plain text, entirely in your browser.",
  aliases: ["base64 encoder", "base64 decoder", "base64 converter"],
  icon: "Binary",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["base64 encode", "base64 decode", "base64 converter online"] },
};
