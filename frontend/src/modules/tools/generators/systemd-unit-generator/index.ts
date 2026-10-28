import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const systemdUnitGeneratorTool: ToolRegistryEntry = {
  slug: "systemd-unit-generator",
  name: "systemd Service Unit Generator",
  module: "generators",
  description: "Create a systemd .service file from an ExecStart line: restart policy, user, working directory, environment, network ordering and optional sandbox hardening, plus install commands.",
  aliases: ["systemd service file","systemctl unit","linux daemon service","service unit builder","run app on boot"],
  icon: "Settings",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["systemd service file","systemctl unit","linux daemon service","service unit builder","run app on boot"] },
};
