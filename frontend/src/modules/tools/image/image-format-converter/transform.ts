import type { ImageFormatConverterOptions } from "./schema";
import { clampQuality, drawAndExport, loadImageSource } from "@/lib/image-canvas";

export interface ImageFormatConverterResult {
  dataUrl: string;
  error: string | null;
}

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
