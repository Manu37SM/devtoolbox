

import { optimize } from "svgo/browser";
import type { SvgOptimizerOptions } from "./schema";

import type { Config, PluginConfig } from "svgo/browser";

export interface SvgOptimizeResult {
  output: string;
  error: { message: string } | null;
  inputBytes: number;
  outputBytes: number;
}

function resolvePlugins(o: SvgOptimizerOptions): PluginConfig[] {
  const preset = o.pluginsPreset;
  const removeViewBox = o.removeViewBox;
  const extras: PluginConfig[] = [];
  if (o.removeTitle) extras.push("removeTitle");
  if (o.removeDimensions) extras.push("removeDimensions");
  if (o.currentColor) extras.push({ name: "convertColors", params: { currentColor: true } });
  const prefix = o.idPrefix?.trim();
  if (prefix) extras.push({ name: "prefixIds", params: { prefix, delim: "-" } });

  const overrides: Record<string, false> = {};
  if (o.keepIds) overrides.cleanupIds = false;

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
    return [...minimalPlugins, ...extras];
  }

  const plugins: PluginConfig[] = [{ name: "preset-default", params: { overrides } }];
  if (removeViewBox) plugins.push("removeViewBox");
  return [...plugins, ...extras];
}

export function optimizeSvg(input: string, options: SvgOptimizerOptions): SvgOptimizeResult {
  const inputBytes = new TextEncoder().encode(input).length;

  if (input.trim().length === 0) {
    return { output: "", error: null, inputBytes: 0, outputBytes: 0 };
  }

  const precision = options.floatPrecision ?? "default";
  const format = options.outputFormat ?? "svg";
  const config: Config = {
    multipass: options.multipass,
    plugins: resolvePlugins(options),
    ...(precision !== "default" ? { floatPrecision: Number(precision) } : {}),
    ...(options.pretty ? { js2svg: { pretty: true, indent: 2 } } : {}),
    ...(format === "dataUri" ? { datauri: "enc" as const } : format === "base64" ? { datauri: "base64" as const } : {}),
  };

  try {
    const result = optimize(input, config);
    // Byte savings compare SVG to SVG, even when the output is shown as a data URI.
    const svgOnly = format === "svg" ? result.data : optimize(input, { ...config, datauri: undefined }).data;
    const outputBytes = new TextEncoder().encode(svgOnly).length;
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
