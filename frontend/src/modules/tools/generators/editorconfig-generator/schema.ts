import { z } from "zod";

export const editorconfigGeneratorOptionsSchema = z.object({
  indentStyle: z.enum(["space", "tab"]).default("space"),
  indentSize: z.number().int().min(1).max(8).default(2),
  endOfLine: z.enum(["lf", "crlf", "cr"]).default("lf"),
  charset: z.enum(["utf-8", "utf-8-bom", "latin1", "utf-16be", "utf-16le"]).default("utf-8"),
  trimTrailing: z.boolean().default(true),
  finalNewline: z.boolean().default(true),
  maxLineLength: z.number().int().min(0).max(400).default(0),
  perLanguage: z.boolean().default(true),
});
export type EditorconfigGeneratorOptions = z.infer<typeof editorconfigGeneratorOptionsSchema>;
