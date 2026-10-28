import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dnsZoneRecordBuilderTool: ToolRegistryEntry = {
  slug: "dns-zone-record-builder",
  name: "DNS Zone Record Builder (BIND)",
  module: "network",
  description: "Write BIND zone file records from simple lines: A, AAAA, CNAME, MX, TXT (auto-split at 255 bytes), NS, SRV, CAA and PTR, with CNAME-conflict and trailing-dot checks.",
  aliases: ["bind zone file","dns records generator","txt record 255","mx record builder","zone file syntax"],
  icon: "Globe",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["bind zone file","dns records generator","txt record 255","mx record builder","zone file syntax"] },
};
