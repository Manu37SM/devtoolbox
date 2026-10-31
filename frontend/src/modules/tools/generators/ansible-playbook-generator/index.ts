import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ansiblePlaybookGeneratorTool: ToolRegistryEntry = {
  slug: "ansible-playbook-generator",
  name: "Ansible Playbook Generator",
  module: "generators",
  description: "Build an Ansible playbook for packages, files, templates, users, services, cron and firewall tasks with become, tags, handlers and variables, checked with ansible-playbook --syntax-check.",
  aliases: ["ansible yaml", "playbook builder", "ansible tasks", "ansible apt service", "ansible handlers"],
  icon: "BookOpenCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ansible playbook generator", "ansible yaml", "playbook builder", "ansible tasks", "ansible apt service", "ansible handlers"] },
};
