import { z } from "zod";

export const aiCommitMessageOptionsSchema = z.object({
  diff: z.string().min(1).max(20_000),
});
export type AiCommitMessageOptions = z.infer<typeof aiCommitMessageOptionsSchema>;
