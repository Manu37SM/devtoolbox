import { z } from "zod";

export const dotenvFormatterOptionsSchema = z.object({
  sortKeys: z.boolean().default(false),
  removeComments: z.boolean().default(false),
  removeEmptyLines: z.boolean().default(false),
  quoteValues: z.enum(["preserve", "always", "never"]).default("preserve"),
});
export type DotenvFormatterOptions = z.infer<typeof dotenvFormatterOptionsSchema>;
