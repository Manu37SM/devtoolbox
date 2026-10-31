import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const authorizedKeysBuilderTool: ToolRegistryEntry = {
  slug: "authorized-keys-builder",
  name: "authorized_keys Builder",
  module: "security",
  description: "Build authorized_keys lines with restrictions like from, command, no-port-forwarding, no-pty and expiry, validating each public key and showing its SHA256 fingerprint.",
  aliases: ["authorized_keys", "ssh key restrictions", "ssh forced command", "ssh from option", "restrict ssh key", "ssh public key options"],
  icon: "KeyRound",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["authorized_keys builder", "authorized_keys", "ssh key restrictions", "ssh forced command", "ssh from option", "restrict ssh key", "ssh public key options"] },
};
