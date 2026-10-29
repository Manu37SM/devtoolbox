import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const vlsmSubnetPlannerTool: ToolRegistryEntry = {
  slug: "vlsm-subnet-planner",
  name: "VLSM Subnet Planner",
  module: "network",
  description: "Split an IPv4 network into right-sized subnets from host counts using VLSM, with AWS, Azure and GCP reserved addresses, usable ranges, fill percentage and the leftover free blocks.",
  aliases: ["vlsm calculator","subnet planner","vpc subnet design","aws subnet sizing","split cidr by hosts"],
  icon: "Network",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["vlsm calculator","subnet planner","vpc subnet design","aws subnet sizing","split cidr by hosts"] },
};
