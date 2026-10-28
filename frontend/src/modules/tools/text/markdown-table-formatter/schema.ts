import { z } from "zod";

export const markdownTableFormatterOptionsSchema = z.object({
  source: z.enum(["markdown", "csv", "tsv"]).default("markdown"),
  align: z.enum(["keep", "left", "center", "right"]).default("keep"),
  compact: z.boolean().default(false),
});
export type MarkdownTableFormatterOptions = z.infer<typeof markdownTableFormatterOptionsSchema>;
