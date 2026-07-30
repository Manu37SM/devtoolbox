import type { UrlEncodeOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

export function transformUrlEncode(input: string, options: UrlEncodeOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };

  try {
    if (options.mode === "encode") {
      const output = options.component ? encodeURIComponent(input) : encodeURI(input);
      return { output, error: null };
    }
    const output = options.component ? decodeURIComponent(input) : decodeURI(input);
    return { output, error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Malformed URI sequence" },
    };
  }
}
