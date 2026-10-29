import { z } from "zod";

export const bigdecimalRoundingOptionsSchema = z.object({
  scale: z.number().int().min(-20).max(40).default(2),
  showDouble: z.boolean().default(true),
});
export type BigdecimalRoundingOptions = z.infer<typeof bigdecimalRoundingOptionsSchema>;
