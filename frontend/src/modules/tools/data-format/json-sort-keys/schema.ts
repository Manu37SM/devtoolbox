import { z } from "zod";

export const jsonSortKeysOptionsSchema = z.object({
  order: z.enum(["asc", "desc", "length", "natural"]).default("asc"),
  deep: z.boolean().default(true),
  caseInsensitive: z.boolean().default(false),
  sortArrays: z.boolean().default(false),
  indent: z.enum(["2", "4", "tab", "min"]).default("2"),
});
export type JsonSortKeysOptions = z.infer<typeof jsonSortKeysOptionsSchema>;
