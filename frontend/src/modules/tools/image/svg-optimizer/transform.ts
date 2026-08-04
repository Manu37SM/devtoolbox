// svgo's default Node entry point (`import { optimize } from "svgo"`) resolves
// to `lib/svgo-node.js` per svgo's package.json `exports["."]` map, which
// additionally wraps the pure optimizer with Node-only config-file-loading
// machinery (reads `svgo.config.js` from disk via `fs`/`path`) — that does
// not bundle for the browser. svgo v4 ships a dedicated isomorphic entry at
// `exports["./browser"]` -> `dist/svgo.browser.js`, a pre-built Rollup bundle
// of just `lib/svgo.js` (the core optimizer) with zero Node built-in
// dependencies — verified by inspecting the published bundle directly
// (https://unpkg.com/svgo@4.0.2/dist/svgo.browser.js), which contains no
// `require(...)`/`fs`/`path` references. The `exports` map also declares a
// `types` condition for this subpath (`types/lib/svgo.d.ts`), so this
// resolves cleanly under `moduleResolution: "bundler"`/"node16" without
// needing a local ambient `.d.ts` shim.
import { optimize } from "svgo/browser";
import type { SvgOptimizerOptions } from "./schema";
// Import the Config/PluginConfig types from the same "svgo/browser" subpath
// (rather than bare "svgo") so type resolution and runtime resolution go
// through the identical exports-map entry — `svgo/browser`'s .d.ts
// re-exports everything from svgo's shared `types.js`, so `Config` and
// `PluginConfig` are available from here too.
import type { Config, PluginConfig } from "svgo/browser";

export interface SvgOptimizeResult {
  output: string;
  error: { message: string } | null;
  inputBytes: number;
  outputBytes: number;
}

/** Resolves this tool's three UI-facing presets ("default"/"safe"/"minimal")
 * to svgo's real plugin configuration. svgo's actual default preset is the
 * single string `"preset-default"` (CLAUDE.md: don't invent library option
 * names) — "safe" and "minimal" are built from the same preset with
 * `overrides` disabling plugins that can alter rendering/geometry, per
 * svgo's documented `PresetDefaultOverrides` shape. */
function resolvePlugins(preset: SvgOptimizerOptions["pluginsPreset"], removeViewBox: boolean): PluginConfig[] {
  // `removeViewBox` is NOT part of svgo v4's `preset-default` plugin set at
  // all (confirmed at runtime — svgo warns "removeViewBox which is not part
  // of preset-default" and silently no-ops the override when passed via
  // `overrides`, per the exact fix svgo's own warning suggests). So it's
  // only ever added as its own separate plugin entry when explicitly
  // requested, never configured through `overrides`.
  const overrides: Record<string, false> = {};

  if (preset === "safe") {
    // Plugins with documented potential to visibly change output are
    // disabled; everything else in preset-default still runs.
    overrides.mergePaths = false;
    overrides.convertShapeToPath = false;
    overrides.convertPathData = false;
  } else if (preset === "minimal") {
    // Only lossless cleanup: comments/metadata/doctype/whitespace —
    // no geometry or attribute rewriting at all.
    const minimalPlugins: PluginConfig[] = [
      "removeComments",
      "removeMetadata",
      "removeDoctype",
      "removeXMLProcInst",
      "removeEditorsNSData",
      "removeEmptyAttrs",
      "removeEmptyText",
      "removeEmptyContainers",
      "collapseGroups",
    ];
    if (removeViewBox) minimalPlugins.push("removeViewBox");
    return minimalPlugins;
  }

  const plugins: PluginConfig[] = [{ name: "preset-default", params: { overrides } }];
  if (removeViewBox) plugins.push("removeViewBox");
  return plugins;
}

/** Optimizes/minifies SVG markup using svgo (approved per ARCHITECTURE.md
 * §8.2 — hand-rolling an SVG optimizer is not a reasonable from-scratch
 * implementation). svgo's `optimize` is synchronous; this stays sync too
 * rather than wrapping in a needless Promise, unlike the beautify/minify
 * tools that wrap an inherently-async Prettier call. */
export function optimizeSvg(input: string, options: SvgOptimizerOptions): SvgOptimizeResult {
  const inputBytes = new TextEncoder().encode(input).length;

  if (input.trim().length === 0) {
    return { output: "", error: null, inputBytes: 0, outputBytes: 0 };
  }

  const config: Config = {
    multipass: options.multipass,
    plugins: resolvePlugins(options.pluginsPreset, options.removeViewBox),
  };

  try {
    const result = optimize(input, config);
    const outputBytes = new TextEncoder().encode(result.data).length;
    return { output: result.data, error: null, inputBytes, outputBytes };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Could not optimize this SVG." },
      inputBytes,
      outputBytes: 0,
    };
  }
}
