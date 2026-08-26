import type { SvgExporterOptions } from "./schema";
import { clampQuality, drawAndExport, loadImageElement } from "@/lib/image-canvas";

export interface SvgExporterResult {
  dataUrl: string;
  error: string | null;
}

export function isLikelySvgMarkup(markup: string): boolean {
  const trimmed = markup.replace(/^﻿/, "").trim();
  if (trimmed.length === 0) return false;
  return /^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(trimmed);
}

export function resolveCanvasBackground(
  outputFormat: SvgExporterOptions["outputFormat"],
  backgroundColor: string,
): string | undefined {
  if (backgroundColor === "transparent") {

    return outputFormat === "image/jpeg" ? "#ffffff" : undefined;
  }
  return backgroundColor;
}

export async function exportSvg(svgMarkup: string, options: SvgExporterOptions): Promise<SvgExporterResult> {
  if (!isLikelySvgMarkup(svgMarkup)) {
    return {
      dataUrl: "",
      error: "This doesn't look like valid SVG markup — it should start with an <svg> (optionally preceded by an <?xml?> declaration).",
    };
  }

  try {
    const quality = clampQuality(options.quality, 92);
    const backgroundColor = resolveCanvasBackground(options.outputFormat, options.backgroundColor);

    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
    const image = await loadImageElement(svgDataUrl);
    const dataUrl = await drawAndExport(image, options.width, options.height, options.outputFormat, quality, backgroundColor);
    return { dataUrl, error: null };
  } catch (err) {
    return {
      dataUrl: "",
      error: err instanceof Error ? err.message : "Could not rasterize this SVG.",
    };
  }
}
