import { format } from "sql-formatter";
import type { SqlFormatterOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

/** Beautifies (or normalizes) SQL using the `sql-formatter` package.
 * Wrapped in try/catch since the library throws on unparseable input. */
export function formatSql(input: string, options: SqlFormatterOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    const output = format(input, {
      language: options.dialect,
      keywordCase: options.keywordCase,
      tabWidth: options.tabWidth,
    });
    return { output, error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Failed to format SQL" },
    };
  }
}
