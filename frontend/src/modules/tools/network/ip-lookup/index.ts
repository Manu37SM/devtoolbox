import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ipLookupTool: ToolRegistryEntry = {
  slug: "ip-lookup",
  name: "IP Lookup",
  module: "network",
  description: "Look up geolocation and organization details for an IP address, or your own.",
  aliases: ["what is my ip", "ip geolocation", "ip address lookup"],
  icon: "MapPin",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: { keywords: ["ip lookup online", "what is my ip", "ip geolocation lookup", "ip address checker"] },
};

export { IpLookupToolView } from "./ToolView";
