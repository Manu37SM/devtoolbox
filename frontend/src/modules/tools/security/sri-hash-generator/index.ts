import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sriHashGeneratorTool: ToolRegistryEntry = {
  slug: "sri-hash-generator",
  name: "Subresource Integrity (SRI) Hash Generator",
  module: "security",
  description: "Compute integrity hashes for scripts and stylesheets (sha256/384/512), build script or link tags with crossorigin, produce CSP hash sources, and verify an existing integrity value.",
  aliases: ["sri", "subresource integrity", "integrity attribute", "csp hash", "sha384 base64", "cdn integrity"],
  icon: "ShieldCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["subresource integrity (sri) hash generator", "sri", "subresource integrity", "integrity attribute", "csp hash", "sha384 base64", "cdn integrity"] },
};
