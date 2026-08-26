import { z } from "zod";

export const boxShadowBorderRadiusOptionsSchema = z.object({
  offsetX: z.number().min(-100).max(100).default(0),
  offsetY: z.number().min(-100).max(100).default(4),
  blur: z.number().min(0).max(200).default(12),
  spread: z.number().min(-100).max(100).default(0),
  color: z.string().default("#000000"),
  opacity: z.number().min(0).max(100).default(20),
  inset: z.boolean().default(false),
  borderRadius: z.number().min(0).max(200).default(12),
});
export type BoxShadowBorderRadiusOptions = z.infer<typeof boxShadowBorderRadiusOptionsSchema>;
