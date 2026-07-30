import * as prettier from "prettier/standalone";
import postcssPlugin from "prettier/plugins/postcss";
import { minify } from "csso";
import type { CssBeautifierOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

/** Formats CSS using Prettier's standalone build + postcss parser plugin;
 * minifies using csso (both approved per ARCHITECTURE.md §8.2). csso's
 * `minify` is synchronous, unlike Prettier's async `format` — the
 * function stays `async` regardless so callers don't need to branch on
 * mode. */
export async function beautifyCss(input: string, options: CssBeautifierOptions): Promise<TransformResult> {
  if (input.trim().length === 0) return { output: "", error: null };

  if (options.mode === "minify") {
    try {
      const result = minify(input);
      return { output: result.css, error: null };
    } catch (err) {
      return { output: "", error: { message: err instanceof Error ? err.message : "Could not minify this CSS." } };
    }
  }

  try {
    const output = await prettier.format(input, {
      parser: "css",
      plugins: [postcssPlugin],
      tabWidth: options.tabWidth,
    });
    return { output, error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Could not parse this CSS." } };
  }
}
