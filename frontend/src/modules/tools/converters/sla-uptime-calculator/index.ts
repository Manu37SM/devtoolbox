import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const slaUptimeCalculatorTool: ToolRegistryEntry = {
  slug: "sla-uptime-calculator",
  name: "SLA & Uptime Calculator",
  module: "converters",
  description: "Turn availability targets like 99.9% into allowed downtime per day, week, month, quarter and year, combine dependencies in series or parallel, or convert downtime back into a percentage.",
  aliases: ["uptime calculator","99.9 downtime per month","sla calculator","error budget","composite sla"],
  icon: "Gauge",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["uptime calculator","99.9 downtime per month","sla calculator","error budget","composite sla"] },
};
