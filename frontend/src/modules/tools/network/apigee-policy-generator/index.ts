import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const apigeePolicyGeneratorTool: ToolRegistryEntry = {
  slug: "apigee-policy-generator",
  name: "Apigee Policy Generator",
  module: "network",
  description: "Generate Apigee X and Edge policy XML: SpikeArrest, Quota, VerifyAPIKey, OAuthV2, AssignMessage, RaiseFault, CORS, threat protection, AccessControl, ResponseCache, KVM and more, with attach points.",
  aliases: ["apigee spike arrest example","apigee quota policy","apigee assign message","apigee cors policy","apigee proxy policies"],
  icon: "Workflow",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["apigee spike arrest example","apigee quota policy","apigee assign message","apigee cors policy","apigee proxy policies"] },
};
