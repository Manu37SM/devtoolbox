import { z } from "zod";

export const contentDispositionBuilderOptionsSchema = z.object({
  mode: z.enum(["build", "parse"]).default("build"),
  disposition: z.enum(["attachment", "inline", "form-data"]).default("attachment"),
  /** form-data field name */
  fieldName: z.string().default("file"),
  /**
   * both: filename="ascii fallback"; filename*=UTF-8''... when needed (what browsers handle best)
   * ascii: fallback only, never filename*
   * extended: only filename*=UTF-8''...
   */
  style: z.enum(["both", "ascii", "extended"]).default("both"),
  /** How non-ASCII characters in the plain filename= fallback are replaced */
  fallback: z.enum(["transliterate", "underscore"]).default("transliterate"),
  /** Drop any directory part ("a/b/c.txt" → "c.txt"); recipients are told to ignore paths anyway */
  stripPath: z.boolean().default(true),
  /** Replace characters Windows forbids in file names (<>:"|?*) with _ */
  windowsSafe: z.boolean().default(false),
  /** Always emit filename* even for pure-ASCII names */
  alwaysExtended: z.boolean().default(false),
  /** Prefix the output with "Content-Disposition: " */
  headerName: z.boolean().default(false),
  /** Output format: raw header or a code snippet for a framework */
  snippet: z.enum(["header", "spring", "servlet", "express", "flask", "aspnet"]).default("header"),
});
export type ContentDispositionBuilderOptions = z.infer<typeof contentDispositionBuilderOptionsSchema>;
