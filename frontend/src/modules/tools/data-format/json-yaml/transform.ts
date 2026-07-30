import { load as loadYaml, dump as dumpYaml } from "js-yaml";
import type { JsonYamlOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

/** Converts between JSON and YAML using js-yaml (approved per
 * ARCHITECTURE.md §8.2 "Tool-specific parsing/formatting libraries").
 * js-yaml's `load`/`dump` are synchronous and DOM-free, so this stays a
 * pure function safe for Workers/SSR/tests. */
export function convertJsonYaml(input: string, options: JsonYamlOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    if (options.mode === "json-to-yaml") {
      const parsed: unknown = JSON.parse(input);
      const output = dumpYaml(parsed, { indent: options.indent, lineWidth: -1, noRefs: true });
      return { output, error: null };
    }

    const parsed: unknown = loadYaml(input);
    const output = JSON.stringify(parsed, null, options.indent);
    return { output, error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Conversion failed" },
    };
  }
}
