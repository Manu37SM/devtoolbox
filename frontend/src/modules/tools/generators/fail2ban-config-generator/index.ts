import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const fail2banConfigGeneratorTool: ToolRegistryEntry = {
  slug: "fail2ban-config-generator",
  name: "fail2ban Jail & Filter Generator",
  module: "generators",
  description: "Generate fail2ban jail.local entries and custom filter files with ban time, retries, ignore lists, actions and failregex, tested with fail2ban-regex against sample log lines.",
  aliases: ["fail2ban jail", "jail.local", "fail2ban filter", "failregex", "ssh brute force ban", "nginx ban"],
  icon: "ShieldBan",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["fail2ban jail & filter generator", "fail2ban jail", "jail.local", "fail2ban filter", "failregex", "ssh brute force ban", "nginx ban"] },
};
