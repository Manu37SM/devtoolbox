import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const pemToolkitTool: ToolRegistryEntry = {
  slug: "pem-toolkit",
  name: "PEM Toolkit",
  module: "security",
  description: "Inspect, split, convert and tidy PEM files: list the blocks in a bundle, convert PEM to and from DER, re-wrap lines, strip headers and extract single blocks.",
  aliases: ["pem to der", "der to pem", "split certificate bundle", "pem bundle", "fullchain", "rewrap pem", "openssl pem"],
  icon: "FileKey",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["pem toolkit", "pem to der", "der to pem", "split certificate bundle", "pem bundle", "fullchain", "rewrap pem", "openssl pem"] },
};
