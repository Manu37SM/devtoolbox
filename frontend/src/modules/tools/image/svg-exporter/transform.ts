import type { SvgExporterOptions } from "./schema";
import { clampQuality, drawAndExport, loadImageElement } from "@/lib/image-canvas";

export interface SvgExporterResult {
  dataUrl: string;
  error: string | null;
}

/** Quick sanity check that a string is at least plausibly SVG markup,
 * before attempting to load it as an image — so garbage input (e.g. pasted
 * JSON, empty string, a PNG's binary content) surfaces a clear "this
 * doesn't look like SVG" error immediately instead of a generic/confusing
 * image-decode failure a few ticks later. Deliberately lenient (this is a
 * sanity check, not a validator/sanitizer): allows a leading `<?xml`
 * declaration or BOM before the `<svg` root tag. Pure. */
export function isLikelySvgMarkup(markup: string): boolean {
  const trimmed = markup.replace(/^﻿/, "").trim();
  if (trimmed.length === 0) return false;
  return /^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(trimmed);
}

/** Resolves the fill color (if any) to paint onto the canvas before
 * drawing the SVG. PNG/WebP support alpha, so a "transparent"
 * `backgroundColor` is left as true transparency (no fill). JPEG has no
 * alpha channel, so a "transparent" selection there is explicitly
 * remapped to opaque white — otherwise the browser would silently
 * composite onto black, which is almost never what the user wants. Pure. */
export function resolveCanvasBackground(
  outputFormat: SvgExporterOptions["outputFormat"],
  backgroundColor: string,
): string | undefined {
  if (backgroundColor === "transparent") {
    // JPEG-transparent-background fallback, per tool spec: fall back to
    // white rather than leaving JPEG export to composite onto black.
    return outputFormat === "image/jpeg" ? "#ffffff" : undefined;
  }
  return backgroundColor;
}

/** Rasterizes SVG markup to PNG/JPEG/WebP at a chosen output size, by
 * loading it into an `<img>` via a `data:image/svg+xml` URL and drawing it
 * onto an offscreen `<canvas>` sized per `options.width`/`options.height`.
 * Async/DOM-dependent (Image/Canvas); see transform.test.ts for why this
 * can't be meaningfully unit-tested under jsdom and what's tested instead. */
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
    // Encode via a data URL rather than a Blob + object URL: simpler (no
    // revoke bookkeeping) and SVG markup is text, so base64/URI-encoding
    // it is cheap.
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
