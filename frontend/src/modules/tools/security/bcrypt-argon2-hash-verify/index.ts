import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const bcryptArgon2HashVerifyTool: ToolRegistryEntry = {
  slug: "bcrypt-argon2-hash-verify",
  name: "bcrypt/argon2 Hash & Verify",
  module: "security",
  description: "Hash a password with bcrypt or Argon2id, or verify a password against an existing hash — via WASM.",
  aliases: ["bcrypt generator", "argon2 hash generator", "password hash verify"],
  icon: "Lock",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["bcrypt hash generator", "argon2 hash generator", "bcrypt verify online"] },
};
