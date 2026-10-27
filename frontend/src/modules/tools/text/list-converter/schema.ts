import { z } from "zod";

export const listConverterOptionsSchema = z.object({
  mode: z.enum(["lines-to-list", "list-to-lines"]).default("lines-to-list"),
  delimiter: z.enum(["comma", "comma-space", "semicolon", "pipe", "tab", "space", "newline"]).default("comma-space"),
  quote: z.enum(["none", "single", "double", "backtick"]).default("none"),
  wrapper: z.enum(["none", "parens", "brackets", "sql-in", "json-array"]).default("none"),
  sort: z.enum(["none", "asc", "desc"]).default("none"),
  trim: z.boolean().default(true),
  skipEmpty: z.boolean().default(true),
  dedupe: z.boolean().default(false),
});
export type ListConverterOptions = z.infer<typeof listConverterOptionsSchema>;

export const listConverterInputSchema = z.string().max(1000000);
