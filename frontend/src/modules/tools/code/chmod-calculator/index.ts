import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const chmodCalculatorTool: ToolRegistryEntry = {
  slug: "chmod-calculator",
  name: "chmod Calculator",
  module: "code",
  description: "Convert between octal (755), symbolic (rwxr-xr-x) and chmod expressions (u+x,go-w), with setuid/setgid/sticky support.",
  aliases: ["unix permissions","chmod octal","file permissions calculator","rwx converter"],
  icon: "ShieldCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["unix permissions","chmod octal","file permissions calculator","rwx converter"] },
};
