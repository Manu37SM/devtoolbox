import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const samlDecoderTool: ToolRegistryEntry = {
  slug: "saml-decoder",
  name: "SAML Decoder",
  module: "security",
  description: "Decode SAML requests and responses from HTTP-POST or HTTP-Redirect (deflated) bindings or full URLs, summarising issuer, NameID, audience, attributes, status and expiry windows.",
  aliases: ["samlresponse decoder","saml tracer online","decode saml assertion","saml request inflate","sso debugging"],
  icon: "IdCard",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["samlresponse decoder","saml tracer online","decode saml assertion","saml request inflate","sso debugging"] },
};
