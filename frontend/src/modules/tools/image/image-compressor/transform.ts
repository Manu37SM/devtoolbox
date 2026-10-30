import type { ImageCompressorOptions } from "./schema";
import {
  clampQuality,
  dataUrlByteLength,
  drawAndExport,
  findQualityForTarget,
  fitWithin,
  loadImageSource,
} from "@/lib/image-canvas";

export interface ImageCompressorResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  /** Output pixel size and the quality actually used (differs from options with a target size). */
  width?: number;
  height?: number;
  quality?: number;
  /** Set when a target size could not be reached even at the lowest quality. */
  warning?: string | null;
  error: string | null;
}

export async function compressImage(file: File, options: ImageCompressorOptions): Promise<ImageCompressorResult> {
  const originalSize = file.size;
  try {
    const source = await loadImageSource(file);
    const { width, height } = fitWithin(source.width, source.height, options.maxDimension ?? 0);
    // JPEG has no alpha: without a fill, transparent pixels turn black.
    const bg = options.format === "image/jpeg" ? options.background || "#ffffff" : undefined;
    const encode = (q: number) => drawAndExport(source, width, height, options.format, q, bg);

    let quality = clampQuality(options.quality);
    let warning: string | null = null;
    let dataUrl: string;
    const target = (options.targetSizeKb ?? 0) * 1024;
    if (target > 0) {
      const cache = new Map<number, string>();
      const found = await findQualityForTarget(async (q) => {
        const url = await encode(q);
        cache.set(q, url);
        return dataUrlByteLength(url);
      }, target);
      quality = found.quality;
      dataUrl = cache.get(quality) ?? (await encode(quality));
      if (!found.met) warning = `Could not reach ${options.targetSizeKb} KB even at quality 1 - try a smaller max dimension.`;
    } else {
      dataUrl = await encode(quality);
    }
    return { dataUrl, originalSize, compressedSize: dataUrlByteLength(dataUrl), width, height, quality, warning, error: null };
  } catch (err) {
    return {
      dataUrl: "",
      originalSize,
      compressedSize: 0,
      error: err instanceof Error ? err.message : "Could not compress this image.",
    };
  }
}
