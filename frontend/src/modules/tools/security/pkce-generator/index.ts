import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const pkceGeneratorTool: ToolRegistryEntry = {
  slug: "pkce-generator",
  name: "PKCE Code Verifier & Challenge",
  module: "security",
  description: "Generate an OAuth 2.0 PKCE code_verifier and S256 code_challenge (RFC 7636), or compute the challenge for a verifier you already have.",
  aliases: ["pkce","code_challenge","oauth code verifier","s256 challenge","oauth2 pkce"],
  icon: "KeyRound",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["pkce","code_challenge","oauth code verifier","s256 challenge","oauth2 pkce"] },
};
