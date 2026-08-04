import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import type { JsonTomlOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

/** Converts between JSON and TOML using smol-toml. Synchronous and
 * DOM-free, so this stays a pure function safe for Workers/SSR/tests. */
export function convertJsonToml(input: string, options: JsonTomlOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    if (options.mode === "json-to-toml") {
      const parsed: unknown = JSON.parse(input);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {
          output: "",
          error: { message: "TOML requires a top-level object, not an array or primitive." },
        };
      }
      const output = stringifyToml(parsed as Record<string, unknown>);
      return { output, error: null };
    }

    const parsed = parseToml(input);
    const output = JSON.stringify(parsed, null, options.indent);
    return { output, error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Conversion failed" },
    };
  }
}
