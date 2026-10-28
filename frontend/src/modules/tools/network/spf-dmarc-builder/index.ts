import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const spfDmarcBuilderTool: ToolRegistryEntry = {
  slug: "spf-dmarc-builder",
  name: "SPF & DMARC Record Builder",
  module: "network",
  description: "Build SPF and DMARC TXT records with validation: counts the 10-lookup limit, warns about ptr, +all and over-long records, and checks report addresses.",
  aliases: ["spf record generator","dmarc record generator","spf lookup limit","email authentication","dmarc policy"],
  icon: "MailCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["spf record generator","dmarc record generator","spf lookup limit","email authentication","dmarc policy"] },
};
