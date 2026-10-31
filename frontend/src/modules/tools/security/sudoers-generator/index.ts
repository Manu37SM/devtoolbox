import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sudoersGeneratorTool: ToolRegistryEntry = {
  slug: "sudoers-generator",
  name: "sudoers Rule Generator",
  module: "security",
  description: "Build /etc/sudoers.d rules for users and groups with run-as targets, hosts, exact commands, NOPASSWD, SETENV, env_keep and logging, with warnings for risky grants.",
  aliases: ["visudo", "sudoers.d", "nopasswd", "sudo rule", "sudo permission", "allow user run command as root"],
  icon: "ShieldAlert",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["sudoers rule generator", "visudo", "sudoers.d", "nopasswd", "sudo rule", "sudo permission", "allow user run command as root"] },
};
