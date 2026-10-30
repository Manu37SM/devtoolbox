import { z } from "zod";

export const sqlInsertParserOptionsSchema = z.object({
  output: z.enum(["csv", "tsv", "json", "markdown"]).default("csv"),
  /** Only this table (name without schema, case-insensitive). Empty = every table found. */
  table: z.string().max(200).default(""),
  /** How SQL NULL is written in CSV/TSV/Markdown. JSON always uses null. */
  nullAs: z.enum(["empty", "NULL", "null", "\\N"]).default("empty"),
  /** Read \' \n \\ inside strings as escapes (MySQL). Off follows the SQL standard where only '' escapes. */
  backslashEscapes: z.boolean().default(false),
  /** JSON: turn numbers and TRUE/FALSE into JSON numbers/booleans instead of strings. */
  typedJson: z.boolean().default(true),
  /** Add the table name as the first column when several tables are exported together. */
  includeTableColumn: z.boolean().default(false),
});
export type SqlInsertParserOptions = z.infer<typeof sqlInsertParserOptionsSchema>;

export const sqlInsertParserInputSchema = z.string().max(5_000_000);
