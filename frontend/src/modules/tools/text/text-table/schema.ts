import { z } from "zod";

export const textTableFromFormatSchema = z.enum(["markdown", "csv", "tsv"]);
export type TextTableFromFormat = z.infer<typeof textTableFromFormatSchema>;

export const textTableToFormatSchema = z.enum(["markdown", "csv", "tsv", "ascii", "html", "json", "jira"]);
export type TextTableToFormat = z.infer<typeof textTableToFormatSchema>;

export const textTableOptionsSchema = z.object({
  from: textTableFromFormatSchema.default("csv"),
  to: textTableToFormatSchema.default("markdown"),
  /** Column alignment for Markdown separators and ASCII padding; "auto" right-aligns numeric columns. */
  align: z.enum(["none", "left", "center", "right", "auto"]).default("none"),
  /** Pad Markdown columns to equal width so the source reads as a grid. */
  padMarkdown: z.boolean().default(false),
  /** Border style for ASCII output. */
  asciiStyle: z.enum(["unicode", "rounded", "double", "ascii", "plain"]).default("unicode"),
  /** First row is a header (JSON gives objects; otherwise arrays, and Markdown gets generic headers). */
  hasHeader: z.boolean().default(true),
  /** Swap rows and columns. */
  transpose: z.boolean().default(false),
});
export type TextTableOptions = z.infer<typeof textTableOptionsSchema>;

export const textTableInputSchema = z.string().max(10_000_000);
