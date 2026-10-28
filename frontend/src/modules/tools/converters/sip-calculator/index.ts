import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sipCalculatorTool: ToolRegistryEntry = {
  slug: "sip-calculator",
  name: "SIP Calculator (Step-up)",
  module: "converters",
  description: "Estimate the future value of a monthly SIP with optional yearly step-up, lump sum and inflation adjustment, or work backwards to the monthly SIP needed for a target corpus. Indian number grouping.",
  aliases: ["mutual fund sip calculator","step up sip","sip goal planner","monthly investment return","sip future value"],
  icon: "TrendingUp",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["mutual fund sip calculator","step up sip","sip goal planner","monthly investment return","sip future value"] },
};
