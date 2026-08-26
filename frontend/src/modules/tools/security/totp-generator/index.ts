import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const totpGeneratorTool: ToolRegistryEntry = {
  slug: "totp-generator",
  name: "TOTP/2FA Code Generator",
  module: "security",
  description: "Generate RFC 6238 TOTP codes from a base32 secret, for testing 2FA flows.",
  aliases: ["totp code generator", "2fa test code", "authenticator code generator"],
  icon: "ShieldCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["totp generator", "2fa code generator", "authenticator test code"] },
};
