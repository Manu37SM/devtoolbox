import { z } from "zod";

export const regexCheatsheetOptionsSchema = z.object({
  searchQuery: z.string().default(""),
});
export type RegexCheatsheetOptions = z.infer<typeof regexCheatsheetOptionsSchema>;
