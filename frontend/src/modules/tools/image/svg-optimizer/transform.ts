

import { optimize } from "svgo/browser";
import type { SvgOptimizerOptions } from "./schema";

import type { Config, PluginConfig } from "svgo/browser";

export interface SvgOptimizeResult {
  output: string;
  error: { message: string } | null;
  inputBytes: number;
  outputBytes: number;
}

function resolvePlugins(preset: SvgOptimizerOptions["pluginsPreset"], removeViewBox: boolean): PluginConfig[] {

  const overrides: Record<string, false> = {};

  if (preset === "safe") {

    overrides.mergePaths = false;
    overrides.convertShapeToPath = false;
    overrides.convertPathData = false;
  } else if (preset === "minimal") {

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
