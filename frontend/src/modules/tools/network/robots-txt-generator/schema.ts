import { z } from "zod";

export const robotsTxtGeneratorOptionsSchema = z.object({
  preset: z.enum(["allow-all", "block-all", "standard"]).default("standard"),
  blockAiCrawlers: z.boolean().default(false),
  crawlDelay: z.number().int().min(0).max(120).default(0),
});
export type RobotsTxtGeneratorOptions = z.infer<typeof robotsTxtGeneratorOptionsSchema>;

export const robotsTxtGeneratorInputSchema = z.string().max(50_000);
