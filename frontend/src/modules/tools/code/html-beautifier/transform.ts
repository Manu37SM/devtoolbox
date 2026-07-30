import * as prettier from "prettier/standalone";
import htmlPlugin from "prettier/plugins/html";
import cssPlugin from "prettier/plugins/postcss";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";
import { minify } from "html-minifier-terser";
import type { HtmlBeautifierOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

/** Formats HTML using Prettier's standalone build + html plugin; minifies
 * using html-minifier-terser (both approved per ARCHITECTURE.md §8.2).
 * CSS/JS plugins are included in beautify mode too since Prettier formats
 * embedded <style>/<script> blocks when they're available; minify mode
 * likewise minifies embedded CSS/JS via html-minifier-terser's
 * minifyCSS/minifyJS options (which delegate to csso/terser internally). */
export async function beautifyHtml(input: string, options: HtmlBeautifierOptions): Promise<TransformResult> {
  if (input.trim().length === 0) return { output: "", error: null };

  if (options.mode === "minify") {
    try {
      const output = await minify(input, {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
      });
      return { output, error: null };
    } catch (err) {
      return { output: "", error: { message: err instanceof Error ? err.message : "Could not minify this HTML." } };
    }
  }

  try {
    const output = await prettier.format(input, {
      parser: "html",
      plugins: [htmlPlugin, cssPlugin, babelPlugin, estreePlugin],
      tabWidth: options.tabWidth,
    });
    return { output, error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Could not parse this HTML." } };
  }
}
