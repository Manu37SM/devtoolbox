import { z } from "zod";

// This tool has no user-configurable input options — creating an inbox
// takes no parameters (API.md §10, `POST /net/webhook-inbox`) — so the
// options schema is intentionally empty, kept for consistency with the
// tool contract (DEVELOPMENT_GUIDE.md §5).
export const webhookTesterOptionsSchema = z.object({});
export type WebhookTesterOptions = z.infer<typeof webhookTesterOptionsSchema>;
