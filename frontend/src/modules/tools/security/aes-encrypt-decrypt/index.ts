import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const aesEncryptDecryptTool: ToolRegistryEntry = {
  slug: "aes-encrypt-decrypt",
  name: "AES Encrypt / Decrypt",
  module: "security",
  description: "Encrypt and decrypt text with AES-256-GCM and a password (PBKDF2-SHA256, 600k iterations). Runs in your browser; the output format is specific to this tool.",
  aliases: ["aes encryption online","encrypt text with password","aes-gcm","decrypt text"],
  icon: "Lock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["aes encryption online","encrypt text with password","aes-gcm","decrypt text"] },
};
