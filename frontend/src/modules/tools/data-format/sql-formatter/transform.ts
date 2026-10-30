import { format, type SqlLanguage } from "sql-formatter";
import type { SqlFormatterOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

export function formatSql(input: string, options: SqlFormatterOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    // Options saved before the newer settings existed fall back to the library defaults.
    const output = format(input, {
      language: options.dialect satisfies SqlLanguage,
      keywordCase: options.keywordCase,
      tabWidth: options.tabWidth,
      useTabs: options.useTabs ?? false,
      functionCase: options.functionCase ?? "preserve",
      dataTypeCase: options.dataTypeCase ?? "preserve",
      indentStyle: options.indentStyle ?? "standard",
      logicalOperatorNewline: options.logicalOperatorNewline ?? "before",
      expressionWidth: options.expressionWidth ?? 50,
      linesBetweenQueries: options.linesBetweenQueries ?? 1,
      denseOperators: options.denseOperators ?? false,
      newlineBeforeSemicolon: options.newlineBeforeSemicolon ?? false,
    });
    return { output, error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Failed to format SQL" },
    };
  }
}
