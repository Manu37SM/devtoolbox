import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cspBuilderTool: ToolRegistryEntry = {
  slug: "csp-builder",
  name: "Content-Security-Policy Builder",
  module: "security",
  description: "Assemble a Content-Security-Policy header from toggles plus your allowed hosts, get meta-tag, Nginx, Apache and Express forms, and a review that flags unsafe-inline, wildcards and missing directives.",
  aliases: ["csp generator","content security policy","csp header","unsafe-inline check","csp report only"],
  icon: "ShieldCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["csp generator","content security policy","csp header","unsafe-inline check","csp report only"] },
};
