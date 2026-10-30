import { load as loadYaml } from "js-yaml";
import type { JsonYamlOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";
import { jsonToYaml } from "@/lib/yaml-dump";

export function convertJsonYaml(input: string, options: JsonYamlOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    if (options.mode === "json-to-yaml") {
      // Lossless: 64-bit IDs and long decimals are written exactly as in the JSON.
      return { output: jsonToYaml(input, options), error: null };
    }

    const parsed: unknown = loadYaml(input);
    const output = JSON.stringify(options.sortKeys ? sortDeep(parsed) : parsed, null, options.indent);
    return { output, error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Conversion failed" },
    };
  }
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortDeep((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}
