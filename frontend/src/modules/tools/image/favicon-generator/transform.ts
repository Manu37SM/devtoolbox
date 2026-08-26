import JSZip from "jszip";

export interface GeneratedFaviconImage {
  size: number;
  dataUrl: string;
  blob: Blob;
}

export interface GenerateFaviconsResult {
  images: GeneratedFaviconImage[];
  error: string | null;
}

export async function generateFavicons(file: File, sizes: number[]): Promise<GenerateFaviconsResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { images: [], error: "Could not read this file as an image." };
  }

  const images: GeneratedFaviconImage[] = [];

  try {
    for (const size of sizes) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return { images: [], error: "Could not access a 2D canvas context in this browser." };
      }

      const scale = Math.min(size / bitmap.width, size / bitmap.height);
      const drawWidth = bitmap.width * scale;
      const drawHeight = bitmap.height * scale;
      const dx = (size - drawWidth) / 2;
      const dy = (size - drawHeight) / 2;
      ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        return { images: [], error: `Could not encode a ${size}x${size} PNG.` };
      }
      const dataUrl = canvas.toDataURL("image/png");
      images.push({ size, dataUrl, blob });
    }
  } finally {
    bitmap.close();
  }

  return { images, error: null };
}

export async function bundleFaviconsAsZip(images: Array<{ size: number; blob: Blob }>): Promise<Blob> {
  const zip = new JSZip();
  for (const { size, blob } of images) {

    zip.file(`favicon-${size}x${size}.png`, await blob.arrayBuffer());
  }
  const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
  return new Blob([zipArrayBuffer], { type: "application/zip" });
}
