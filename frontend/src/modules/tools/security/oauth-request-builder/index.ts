import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const oauthRequestBuilderTool: ToolRegistryEntry = {
  slug: "oauth-request-builder",
  name: "OAuth 2.0 & OIDC Request Builder",
  module: "security",
  description: "Build OAuth 2.0 and OpenID Connect requests: authorize URLs with PKCE, token exchanges, client credentials, refresh and device flows as curl, for Keycloak, Okta, Auth0, Entra ID or Google.",
  aliases: ["pkce generator url","oauth curl","client credentials curl","keycloak token endpoint","oauth callback parser"],
  icon: "LockKeyhole",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["pkce generator url","oauth curl","client credentials curl","keycloak token endpoint","oauth callback parser"] },
};
