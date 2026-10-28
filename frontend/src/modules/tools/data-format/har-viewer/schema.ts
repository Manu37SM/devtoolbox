import { z } from "zod";

export const harViewerOptionsSchema = z.object({
  sortBy: z.enum(["order", "time", "size", "status"]).default("order"),
  onlyErrors: z.boolean().default(false),
  maxRows: z.number().int().min(1).max(5000).default(200),
});
export type HarViewerOptions = z.infer<typeof harViewerOptionsSchema>;

export const harViewerInputSchema = z.string().max(50_000_000);
