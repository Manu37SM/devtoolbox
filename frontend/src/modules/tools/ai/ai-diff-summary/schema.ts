import { z } from "zod";

export const aiDiffSummaryOptionsSchema = z.object({
  before: z.string().max(20_000),
  after: z.string().max(20_000),
  format: z.enum(["text", "json"]).default("text"),
});
export type AiDiffSummaryOptions = z.infer<typeof aiDiffSummaryOptionsSchema>;
