import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const linkHeaderParserTool: ToolRegistryEntry = {
  slug: "link-header-parser",
  name: "HTTP Link Header Parser",
  module: "network",
  description: "Parse RFC 8288 Link headers: pagination (next, prev, last), preload hints and more. Handles quoted parameters, commas inside URLs and multi-line values, with lint hints.",
  aliases: ["link header pagination","rel next last","rfc 8288","preload header","github api pagination"],
  icon: "Link2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["link header pagination","rel next last","rfc 8288","preload header","github api pagination"] },
};
