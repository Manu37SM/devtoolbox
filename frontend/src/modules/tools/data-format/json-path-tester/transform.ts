import { search as jmespathSearch } from "jmespath";
import type { JsonPathTesterOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

export function runJsonPath(input: string, options: JsonPathTesterOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Invalid JSON" },
    };
  }

  if (options.expression.trim().length === 0) {
    return { output: "", error: { message: "Enter a JMESPath expression." } };
  }

  try {
    const result: unknown = jmespathSearch(parsed, options.expression);
    if (result === undefined) {
      return { output: "null", error: null };
    }
    return { output: JSON.stringify(result, null, options.indent), error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Invalid JMESPath expression" },
    };
  }
}
