import { z } from "zod";

export const webhookTesterOptionsSchema = z.object({});
export type WebhookTesterOptions = z.infer<typeof webhookTesterOptionsSchema>;
