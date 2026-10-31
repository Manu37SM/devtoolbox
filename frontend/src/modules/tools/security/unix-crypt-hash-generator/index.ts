import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const unixCryptHashGeneratorTool: ToolRegistryEntry = {
  slug: "unix-crypt-hash-generator",
  name: "Unix crypt Hash Generator ($1$, $5$, $6$)",
  module: "security",
  description: "Generate and verify Linux /etc/shadow password hashes in MD5-crypt, SHA-256-crypt and SHA-512-crypt formats with custom salt and rounds, matching openssl passwd and mkpasswd output.",
  aliases: ["shadow password hash", "mkpasswd", "openssl passwd", "sha512crypt", "$6$", "md5crypt", "etc shadow"],
  icon: "Lock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["unix crypt hash generator ($1$, $5$, $6$)", "shadow password hash", "mkpasswd", "openssl passwd", "sha512crypt", "$6$", "md5crypt", "etc shadow"] },
};
