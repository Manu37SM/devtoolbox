import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const csrDecoderTool: ToolRegistryEntry = {
  slug: "csr-decoder",
  name: "CSR Decoder",
  module: "security",
  description: "Decode a PKCS#10 certificate signing request: subject, SANs, key type and size, signature algorithm and validity of its signature, fingerprints and warnings for weak keys or missing names.",
  aliases: ["certificate signing request", "decode csr", "pkcs10", "openssl req -text", "check csr", "csr subject alternative name"],
  icon: "FileSearch",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["csr decoder", "certificate signing request", "decode csr", "pkcs10", "openssl req -text", "check csr", "csr subject alternative name"] },
};
