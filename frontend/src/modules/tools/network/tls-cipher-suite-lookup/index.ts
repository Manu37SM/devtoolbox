import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const tlsCipherSuiteLookupTool: ToolRegistryEntry = {
  slug: "tls-cipher-suite-lookup",
  name: "TLS Cipher Suite Lookup",
  module: "network",
  description: "Look up TLS cipher suites by IANA name, OpenSSL name or hex code and rate them recommended, secure, weak or insecure, with key exchange, cipher, MAC, forward secrecy and the reasons.",
  aliases: ["cipher suite checker","openssl cipher to iana","tls 1.2 ciphers","weak cipher suites","ciphersuite info"],
  icon: "Lock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["cipher suite checker","openssl cipher to iana","tls 1.2 ciphers","weak cipher suites","ciphersuite info"] },
};
