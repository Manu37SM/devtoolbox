import { z } from "zod";

export const codeDiffOptionsSchema = z.object({
  language: z
    .enum(["javascript", "json", "css", "html", "xml", "yaml", "markdown", "other"])
    .default("javascript"),
  ignoreWhitespace: z.boolean().default(false),
  ignoreCase: z.boolean().default(false),
});
export type CodeDiffOptions = z.infer<typeof codeDiffOptionsSchema>;
