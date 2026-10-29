import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jwksInspectorTool: ToolRegistryEntry = {
  slug: "jwks-inspector",
  name: "JWK & JWKS Inspector",
  module: "security",
  description: "Inspect JWKS documents and JWKs: RFC 7638 thumbprints, key sizes, alg and curve mismatches, leaked private members and duplicate kids, plus JWK to PEM and PEM to JWKS conversion.",
  aliases: ["jwks viewer","jwk to pem","pem to jwk","jwk thumbprint","openid jwks checker"],
  icon: "KeySquare",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["jwks viewer","jwk to pem","pem to jwk","jwk thumbprint","openid jwks checker"] },
};
