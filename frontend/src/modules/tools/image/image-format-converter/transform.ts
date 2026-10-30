import type { ImageFormatConverterOptions } from "./schema";
import { clampQuality, drawAndExport, fitWithin, loadImageSource } from "@/lib/image-canvas";

export interface ImageFormatConverterResult {
  dataUrl: string;
  width?: number;
  height?: number;
  error: string | null;
}

export async function convertImageFormat(
  file: File,
  options: ImageFormatConverterOptions,
): Promise<ImageFormatConverterResult> {
  try {
    const quality = clampQuality(options.quality, 92);
    const source = await loadImageSource(file);
    const { width, height } = fitWithin(source.width, source.height, options.maxDimension ?? 0);
    // JPEG has no alpha: without a fill, transparent pixels turn black.
    const bg = options.targetFormat === "image/jpeg" ? options.background || "#ffffff" : undefined;
    const dataUrl = await drawAndExport(source, width, height, options.targetFormat, quality, bg);
    return { dataUrl, width, height, error: null };
  } catch (err) {
    return { dataUrl: "", error: err instanceof Error ? err.message : "Could not convert this image." };
  }
}
