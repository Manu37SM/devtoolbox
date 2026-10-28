import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const hashIdentifierTool: ToolRegistryEntry = {
  slug: "hash-identifier",
  name: "Hash Identifier",
  module: "security",
  description: "Work out what kind of hash you are looking at: MD5, SHA family, bcrypt, Argon2, scrypt, crypt formats, NTLM, MySQL and more, from length and prefix.",
  aliases: ["what hash is this","identify hash type","bcrypt vs sha256","hash type detector","md5 or ntlm"],
  icon: "Hash",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["what hash is this","identify hash type","bcrypt vs sha256","hash type detector","md5 or ntlm"] },
};
