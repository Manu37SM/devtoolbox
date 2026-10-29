import type { UrlEncodeOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

function convert(text: string, options: UrlEncodeOptions): string {
  if (options.mode === "encode") {
    const out = options.component ? encodeURIComponent(text) : encodeURI(text);
    return options.formEncoding ? out.replace(/%20/g, "+") : out;
  }
  const src = options.formEncoding ? text.replace(/\+/g, " ") : text;
  return options.component ? decodeURIComponent(src) : decodeURI(src);
}

export function transformUrlEncode(input: string, options: UrlEncodeOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };

  if (options.perLine) {
    const lines = input.split(/\r?\n/);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      try {
        out.push(convert(lines[i]!, options));
      } catch (err) {
        return { output: "", error: { message: `Line ${i + 1}: ${err instanceof Error ? err.message : "Malformed URI sequence"}` } };
      }
    }
    return { output: out.join("\n"), error: null };
  }

  try {
    return { output: convert(input, options), error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Malformed URI sequence" },
    };
  }
}
