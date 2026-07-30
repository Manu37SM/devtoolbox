import { z } from "zod";

export const loremIpsumOptionsSchema = z.object({
  unit: z.enum(["words", "sentences", "paragraphs", "list-items"]).default("paragraphs"),
  count: z.number().int().min(1).max(200).default(3),
  startWithLoremIpsum: z.boolean().default(true),
});
export type LoremIpsumOptions = z.infer<typeof loremIpsumOptionsSchema>;
