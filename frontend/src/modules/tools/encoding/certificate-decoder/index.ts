import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const certificateDecoderTool: ToolRegistryEntry = {
  slug: "certificate-decoder",
  name: "Certificate (PEM/CRT) Decoder",
  module: "encoding",
  description: "Parse a PEM-encoded X.509 certificate and view its subject, issuer, validity, and key fields.",
  aliases: ["x509 decoder", "pem certificate viewer", "ssl certificate decoder"],
  icon: "FileBadge",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["certificate decoder", "x509 certificate viewer", "pem decoder online"] },
};
