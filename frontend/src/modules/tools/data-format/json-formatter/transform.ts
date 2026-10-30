import type { JsonFormatterOptions } from "./schema";
import { JsonSyntaxError, parseJsonLossless, stringifyJsonLossless } from "@/lib/json-lossless";

export interface TransformResult {
  output: string;
  error: { message: string; line?: number; column?: number } | null;
}

/**
 * Formats JSON without changing it: numbers are re-emitted exactly as written
 * (JSON.parse would round 64-bit IDs and long decimals) and key order is kept
 * unless sorting is requested.
 */
export function formatJson(input: string, options: JsonFormatterOptions): TransformResult {
  if (input.trim().length === 0) {
    return { output: "", error: null };
  }

  try {
    const tree = parseJsonLossless(input);
    const minify = options.mode === "minify";
    const output = stringifyJsonLossless(tree, {
      indent: minify ? 0 : options.indent === "tab" ? "\t" : options.indent,
      sortKeys: options.sortKeys,
      escapeUnicode: options.escapeUnicode,
      inlineArraysUpTo: options.inlineShortArrays && !minify ? 80 : 0,
    });
    return { output, error: null };
  } catch (err) {
    if (err instanceof JsonSyntaxError) return { output: "", error: { message: err.message, line: err.line, column: err.column } };
    return { output: "", error: { message: err instanceof Error ? err.message : "Invalid JSON" } };
  }
}
