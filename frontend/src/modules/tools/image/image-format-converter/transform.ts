import type { ImageFormatConverterOptions } from "./schema";
import { clampQuality, drawAndExport, loadImageSource } from "@/lib/image-canvas";

export interface ImageFormatConverterResult {
  dataUrl: string;
  error: string | null;
}

/** Converts an image `File` to a different raster format by redrawing it
 * onto an offscreen `<canvas>` and re-encoding via `canvas.toBlob` — the
 * browser's native encoder, no dedicated codec library (documented v1
 * simplification, see content.mdx). Async/DOM-dependent (Canvas/Image);
 * see transform.test.ts for why this can't be meaningfully unit-tested
 * under jsdom and what's tested instead. */
export async function convertImageFormat(
  file: File,
  options: ImageFormatConverterOptions,
): Promise<ImageFormatConverterResult> {
  try {
    const quality = clampQuality(options.quality, 92);
    const source = await loadImageSource(file);
    const dataUrl = await drawAndExport(source, source.width, source.height, options.targetFormat, quality);
    return { dataUrl, error: null };
  } catch (err) {
    return { dataUrl: "", error: err instanceof Error ? err.message : "Could not convert this image." };
  }
}
