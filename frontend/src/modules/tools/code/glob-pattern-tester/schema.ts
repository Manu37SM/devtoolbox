import { z } from "zod";

export const globPatternTesterOptionsSchema = z.object({
  mode: z.enum(["glob", "gitignore"]).default("glob"),
  dot: z.boolean().default(false),
  ignoreCase: z.boolean().default(false),
});
export type GlobPatternTesterOptions = z.infer<typeof globPatternTesterOptionsSchema>;

export const globPatternTesterInputSchema = z.string().max(500_000);
