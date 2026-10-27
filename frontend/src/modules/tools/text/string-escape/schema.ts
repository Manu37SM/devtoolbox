import { z } from "zod";

export const stringEscapeOptionsSchema = z.object({
  mode: z.enum(["escape", "unescape"]).default("escape"),
  language: z.enum(["json", "javascript", "java", "sql", "regex", "csv", "shell"]).default("json"),
});
export type StringEscapeOptions = z.infer<typeof stringEscapeOptionsSchema>;

export const stringEscapeInputSchema = z.string().max(1000000);
