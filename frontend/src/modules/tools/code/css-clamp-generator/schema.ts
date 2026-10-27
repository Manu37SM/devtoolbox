import { z } from "zod";

export const cssClampGeneratorOptionsSchema = z.object({
  minSize: z.number().min(0).default(16),
  maxSize: z.number().min(0).default(24),
  minViewport: z.number().min(0).default(320),
  maxViewport: z.number().min(1).default(1280),
  unit: z.enum(["rem", "px"]).default("rem"),
  rootPx: z.number().min(1).default(16),
});
export type CssClampGeneratorOptions = z.infer<typeof cssClampGeneratorOptionsSchema>;

export const cssClampGeneratorInputSchema = z.string().max(1000000);
