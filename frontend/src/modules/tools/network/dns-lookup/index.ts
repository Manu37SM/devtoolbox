import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dnsLookupTool: ToolRegistryEntry = {
  slug: "dns-lookup",
  name: "DNS Lookup",
  module: "network",
  description: "Look up A, AAAA, CNAME, MX, TXT, NS, or SOA records for a domain.",
  aliases: ["dns checker", "nslookup online", "dig online"],
  icon: "Server",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: { keywords: ["dns lookup online", "nslookup", "mx record checker", "dns record checker"] },
};

export { DnsLookupToolView } from "./ToolView";
