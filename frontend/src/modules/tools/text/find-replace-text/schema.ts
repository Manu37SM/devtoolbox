import { z } from "zod";

export const findReplaceTextOptionsSchema = z.object({
  find: z.string().max(10000).default(""),
  replace: z.string().max(10000).default(""),
  useRegex: z.boolean().default(false),
  caseSensitive: z.boolean().default(false),
  wholeWord: z.boolean().default(false),
});
export type FindReplaceTextOptions = z.infer<typeof findReplaceTextOptionsSchema>;

export const findReplaceTextInputSchema = z.string().max(1000000);
