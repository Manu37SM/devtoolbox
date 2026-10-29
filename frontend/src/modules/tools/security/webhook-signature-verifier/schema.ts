import { z } from "zod";

export const webhookSignatureVerifierOptionsSchema = z.object({
  provider: z.enum(["github", "stripe", "slack", "razorpay", "shopify", "standard", "generic"]).default("github"),
  algorithm: z.enum(["sha256", "sha1", "sha512"]).default("sha256"),
  encoding: z.enum(["hex", "base64"]).default("hex"),
});
export type WebhookSignatureVerifierOptions = z.infer<typeof webhookSignatureVerifierOptionsSchema>;
