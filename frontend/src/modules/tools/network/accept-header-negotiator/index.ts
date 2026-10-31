import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const acceptHeaderNegotiatorTool: ToolRegistryEntry = {
  slug: "accept-header-negotiator",
  name: "Accept Header Parser & Content Negotiator",
  module: "network",
  description: "Parse Accept, Accept-Language, Accept-Encoding and Accept-Charset headers by q-value and specificity, then pick the best match from the types your server offers (RFC 9110).",
  aliases: ["accept header", "content negotiation", "q-value", "accept-language", "accept-encoding", "406 not acceptable"],
  icon: "ListFilter",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["accept header parser & content negotiator", "accept header", "content negotiation", "q-value", "accept-language", "accept-encoding", "406 not acceptable"] },
};
