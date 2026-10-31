import { z } from "zod";

export const lineEndingConverterOptionsSchema = z.object({
  /** Line ending to write; "keep" leaves every line as it is */
  eol: z.enum(["keep", "lf", "crlf", "cr"]).default("lf"),
  bom: z.enum(["keep", "add", "remove"]).default("remove"),
  trimTrailing: z.boolean().default(true),
  finalNewline: z.enum(["keep", "add", "remove", "single"]).default("add"),
  /** Tabs → spaces: only in the indentation, or every tab (aligned to tab stops like expand) */
  tabsToSpaces: z.enum(["none", "leading", "all"]).default("none"),
  /** Leading runs of spaces → tabs (like unexpand --first-only) */
  spacesToTabs: z.boolean().default(false),
  tabWidth: z.number().int().min(1).max(16).default(4),
  /** Longest allowed run of blank lines; 0 = do not touch */
  maxBlankLines: z.number().int().min(0).max(20).default(0),
  /** Delete zero-width spaces, joiners, bidi controls and other invisible characters */
  removeInvisible: z.boolean().default(false),
  /** Replace non-breaking and other exotic spaces with a normal space */
  normalizeSpaces: z.boolean().default(false),
  /** Delete control characters except tab and line breaks */
  removeControl: z.boolean().default(false),
  /** Show the summary of what was found and changed instead of the converted text */
  output: z.enum(["text", "report", "text-and-report"]).default("text"),
});
export type LineEndingConverterOptions = z.infer<typeof lineEndingConverterOptionsSchema>;
