import { z } from "zod";

export const markdownTocGeneratorOptionsSchema = z.object({
  minLevel: z.number().int().min(1).max(6).default(1),
  maxLevel: z.number().int().min(1).max(6).default(3),
  bullet: z.enum(["dash", "star", "numbered"]).default("dash"),
  links: z.boolean().default(true),
});
export type MarkdownTocGeneratorOptions = z.infer<typeof markdownTocGeneratorOptionsSchema>;

export const markdownTocGeneratorInputSchema = z.string().max(2_000_000);
