import type { JsonFormatterOptions } from "./schema";

export interface TransformResult {
  output: string;
  error: { message: string; line?: number; column?: number } | null;
}

/**
 * Pure transform function — no DOM/React dependency, per the tool contract
 * in DEVELOPMENT_GUIDE.md §5. Must be safe to run in a Web Worker, on the
 * server (SSR/tests), or in a future CLI without modification.
 */
export function formatJson(input: string, options: JsonFormatterOptions): TransformResult {
  if (input.trim().length === 0) {
    return { output: "", error: null };
  }

  try {
    const parsed: unknown = JSON.parse(input);
    const normalized = options.sortKeys ? sortKeysDeep(parsed) : parsed;

    if (options.mode === "minify") {
      return { output: JSON.stringify(normalized), error: null };
    }

    const indent = options.indent === "tab" ? "\t" : options.indent;
    return { output: JSON.stringify(normalized, null, indent), error: null };
  } catch (err) {
    return { output: "", error: parseJsonError(err, input) };
  }
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeysDeep(v)]));
  }
  return value;
}

function parseJsonError(
  err: unknown,
  input: string,
): { message: string; line?: number; column?: number } {
  const message = err instanceof Error ? err.message : "Invalid JSON";
  const positionMatch = /position (\d+)/.exec(message);

  if (!positionMatch) {
    return { message };
  }

  const position = Number(positionMatch[1]);
  const upToError = input.slice(0, position);
  const line = upToError.split("\n").length;
  const column = position - upToError.lastIndexOf("\n");

  return { message, line, column };
}
