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

/** Generates a PNG at each requested size from a source image by drawing it
 * to an offscreen canvas, scaled to fit (simple uniform scale-to-fit into a
 * square canvas — no smart cropping for v1, matching the task brief). Not a
 * pure function (canvas/Image APIs), so this can't run in a Worker or under
 * jsdom — see transform.test.ts for what's tested instead. */
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

      // Scale-to-fit: preserve aspect ratio, center on a transparent square.
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

/** Bundles generated favicon PNGs into a single downloadable zip using
 * jszip. Pure aside from the async zip-generation call itself — takes
 * already-produced `Blob`s rather than touching canvas/Image directly, so
 * (unlike `generateFavicons`) this genuinely can be unit tested with
 * synthetic fake blobs, no DOM/canvas required. */
export async function bundleFaviconsAsZip(images: Array<{ size: number; blob: Blob }>): Promise<Blob> {
  const zip = new JSZip();
  for (const { size, blob } of images) {
    // Feed jszip an ArrayBuffer rather than the Blob directly. jszip only
    // accepts Blob input when it detects full browser Blob/FileReader
    // support at load time (`JSZip.support.blob`) — that detection can be
    // false in non-browser test runners (confirmed: this repo's Vitest
    // config runs tests under Node, not jsdom), even though `Blob` itself
    // is a real global there. ArrayBuffer is universally supported by
    // jszip regardless of environment, and every `Blob` (real or
    // Node's/jsdom's) implements `.arrayBuffer()`, so this works
    // identically in the browser and in tests.
    zip.file(`favicon-${size}x${size}.png`, await blob.arrayBuffer());
  }
  const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
  return new Blob([zipArrayBuffer], { type: "application/zip" });
}
