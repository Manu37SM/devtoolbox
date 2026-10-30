import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sshConfigGeneratorTool: ToolRegistryEntry = {
  slug: "ssh-config-generator",
  name: "SSH Config Generator",
  module: "generators",
  description: "Build an ~/.ssh/config from simple host lines: users, ports, keys, ProxyJump bastions, port forwards, keep-alive, connection multiplexing and agent settings, with validation of jump hosts.",
  aliases: ["ssh config", "~/.ssh/config", "proxyjump bastion", "ssh host alias", "ssh port forwarding config", "ssh multiplexing"],
  icon: "Terminal",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ssh config generator", "ssh config", "~/.ssh/config", "proxyjump bastion", "ssh host alias", "ssh port forwarding config", "ssh multiplexing"] },
};
