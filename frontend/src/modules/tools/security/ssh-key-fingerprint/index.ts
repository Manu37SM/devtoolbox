import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sshKeyFingerprintTool: ToolRegistryEntry = {
  slug: "ssh-key-fingerprint",
  name: "SSH Public Key Fingerprint",
  module: "security",
  description: "Compute SHA256 and MD5 fingerprints of OpenSSH public keys (RSA, ED25519, ECDSA, DSA) exactly as ssh-keygen -lf prints them, with key size and weak-key warnings.",
  aliases: ["ssh-keygen -lf","authorized_keys fingerprint","github ssh key fingerprint","ssh key bits","openssh public key"],
  icon: "KeyRound",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ssh-keygen -lf","authorized_keys fingerprint","github ssh key fingerprint","ssh key bits","openssh public key"] },
};
