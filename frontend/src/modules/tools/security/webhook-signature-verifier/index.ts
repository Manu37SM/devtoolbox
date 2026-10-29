import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const webhookSignatureVerifierTool: ToolRegistryEntry = {
  slug: "webhook-signature-verifier",
  name: "Webhook Signature Verifier",
  module: "security",
  description: "Compute and verify webhook HMAC signatures for GitHub, Stripe, Slack, Razorpay, Shopify and Standard Webhooks (Svix) or any HMAC scheme, with replay-window checks and mismatch hints.",
  aliases: ["verify stripe signature","github webhook secret","razorpay webhook signature","hmac signature checker","svix verify"],
  icon: "Webhook",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["verify stripe signature","github webhook secret","razorpay webhook signature","hmac signature checker","svix verify"] },
};
