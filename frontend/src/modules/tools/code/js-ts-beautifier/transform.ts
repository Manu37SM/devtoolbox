import * as prettier from "prettier/standalone";
import babelPlugin from "prettier/plugins/babel";
import typescriptPlugin from "prettier/plugins/typescript";
import estreePlugin from "prettier/plugins/estree";
import { minify } from "terser";
import type { JsTsBeautifierOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

/** Formats/minifies JS/TS. Beautify uses Prettier's standalone build;
 * minify uses Terser (both approved per ARCHITECTURE.md §8.2). Async
 * because both libraries' APIs are promise-based; still a pure function
 * otherwise.
 *
 * Terser only understands plain JavaScript — it doesn't strip TypeScript
 * type syntax. Minifying TypeScript would need a transpile-to-JS step
 * first (esbuild/swc/babel-typescript), which isn't part of the approved
 * dependency set for this pass, so TS+minify returns a clear error
 * instead of silently producing wrong output or crashing on `: string`
 * type annotations. */
export async function beautifyJsTs(input: string, options: JsTsBeautifierOptions): Promise<TransformResult> {
  if (input.trim().length === 0) return { output: "", error: null };

  if (options.mode === "minify") {
    if (options.language === "typescript") {
      return {
        output: "",
        error: {
          message:
            "Minifying TypeScript isn't supported yet — Terser only understands plain JavaScript syntax. Switch to JavaScript, or use the Beautify mode for TypeScript.",
        },
      };
    }
    return minifyJs(input);
  }

  try {
    const output = await prettier.format(input, {
      parser: options.language === "typescript" ? "typescript" : "babel",
      plugins: options.language === "typescript" ? [typescriptPlugin, estreePlugin] : [babelPlugin, estreePlugin],
      semi: options.semi,
      singleQuote: options.singleQuote,
      tabWidth: options.tabWidth,
    });
    return { output, error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Could not parse this code." } };
  }
}

async function minifyJs(input: string): Promise<TransformResult> {
  try {
    const result = await minify(input, { mangle: true, compress: true });
    if (!result.code) {
      return { output: "", error: { message: "Terser produced no output for this input." } };
    }
    return { output: result.code, error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Could not minify this code." } };
  }
}
