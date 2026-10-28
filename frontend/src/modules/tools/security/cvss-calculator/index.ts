import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cvssCalculatorTool: ToolRegistryEntry = {
  slug: "cvss-calculator",
  name: "CVSS v3.x Calculator",
  module: "security",
  description: "Calculate CVSS 3.0 and 3.1 base scores and severity from vector strings, with the exploitability and impact sub-scores and a readable metric breakdown.",
  aliases: ["cvss score","cvss vector","cvss 3.1 calculator","vulnerability severity","cve score calculator"],
  icon: "ShieldAlert",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["cvss score","cvss vector","cvss 3.1 calculator","vulnerability severity","cve score calculator"] },
};
