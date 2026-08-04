import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const webhookTesterTool: ToolRegistryEntry = {
  slug: "webhook-tester",
  name: "Webhook Tester",
  module: "network",
  description: "Get a temporary URL that captures and displays inbound webhook requests in real time.",
  aliases: ["webhook inspector", "request bin", "webhook catcher"],
  icon: "Webhook",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: { keywords: ["webhook tester online", "webhook inspector", "request bin", "test webhooks"] },
};

export { WebhookTesterToolView } from "./ToolView";
