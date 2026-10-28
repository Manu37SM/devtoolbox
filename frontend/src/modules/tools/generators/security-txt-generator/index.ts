import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const securityTxtGeneratorTool: ToolRegistryEntry = {
  slug: "security-txt-generator",
  name: "security.txt Generator",
  module: "generators",
  description: "Generate an RFC 9116 security.txt for /.well-known/: contact, policy, encryption key, hiring, canonical URL and an automatic Expires date, with validation of every field.",
  aliases: ["security.txt","rfc 9116","vulnerability disclosure file",".well-known security","responsible disclosure"],
  icon: "ShieldCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["security.txt","rfc 9116","vulnerability disclosure file",".well-known security","responsible disclosure"] },
};
