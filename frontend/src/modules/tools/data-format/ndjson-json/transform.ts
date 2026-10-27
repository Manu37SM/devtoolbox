import type { TransformResult } from "@/lib/tool-transform";
import type { NdjsonJsonOptions } from "./schema";

export function convertNdjson(input: string, options: NdjsonJsonOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  if (options.mode === "ndjson-to-json") {
    const items: unknown[] = [];
    const lines = input.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (line === "") continue;
      try {
        items.push(JSON.parse(line));
      } catch (e) {
        return { output: "", error: { message: `Line ${i + 1}: ${e instanceof Error ? e.message : "invalid JSON"}`, line: i + 1 } };
      }
    }
    return { output: JSON.stringify(items, null, Number(options.indent) === 0 ? undefined : Number(options.indent)), error: null };
  }

  try {
    const parsed: unknown = JSON.parse(input);
    if (!Array.isArray(parsed)) {
      return { output: "", error: { message: "Top-level JSON value must be an array — each element becomes one line." } };
    }
    return { output: parsed.map((item) => JSON.stringify(item)).join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}` } };
  }
}
