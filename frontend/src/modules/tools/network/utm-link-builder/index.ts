import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const utmLinkBuilderTool: ToolRegistryEntry = {
  slug: "utm-link-builder",
  name: "UTM Campaign Link Builder",
  module: "network",
  description: "Add consistent utm_source, utm_medium, utm_campaign, utm_term and utm_content parameters to one or many URLs, preserving existing queries and #fragments.",
  aliases: ["utm generator","campaign url builder","google analytics utm","tracking link","utm parameters"],
  icon: "Link2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["utm generator","campaign url builder","google analytics utm","tracking link","utm parameters"] },
};
