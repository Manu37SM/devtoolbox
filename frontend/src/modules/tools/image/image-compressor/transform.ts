import type { ImageCompressorOptions } from "./schema";
import { clampQuality, dataUrlByteLength, drawAndExport, loadImageSource } from "@/lib/image-canvas";

export interface ImageCompressorResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  error: string | null;
}

export async function compressImage(file: File, options: ImageCompressorOptions): Promise<ImageCompressorResult> {
  const originalSize = file.size;
  try {
    const quality = clampQuality(options.quality);
    const source = await loadImageSource(file);
    const dataUrl = await drawAndExport(source, source.width, source.height, options.format, quality);
    return { dataUrl, originalSize, compressedSize: dataUrlByteLength(dataUrl), error: null };
  } catch (err) {
    return {
      dataUrl: "",
      originalSize,
      compressedSize: 0,
      error: err instanceof Error ? err.message : "Could not compress this image.",
    };
  }
}
