// Shared helpers for Module 7's canvas-based image tools (Image Compressor,
// Image Format Converter, SVG Exporter). Extracted here instead of
// duplicated per tool per CLAUDE.md's "Compose, don't rebuild" / working
// style rule against solving the same sub-problem (byte-size formatting,
// MIME/extension mapping, quality clamping, canvas draw+export) three
// times.
//
// This file intentionally mixes two kinds of functions:
//   - Pure functions (clampQuality, formatBytes, computeSizeReductionPercent,
//     mimeToExtension, dataUrlByteLength) — fully unit-tested.
//   - DOM/Canvas-dependent functions (loadImageSource, drawAndExport) — these
//     require a real <canvas> 2D context and image decoder, which jsdom (this
//     repo's Vitest environment) does not implement. They are exercised
//     manually/in browser E2E rather than Vitest; see the comment atop each
//     tool's transform.test.ts.

export type CanvasMimeType = "image/png" | "image/jpeg" | "image/webp";

/** Clamps a quality value (1-100, matching each tool's Zod schema) into a
 * safe integer range so a bad/out-of-range value can't be passed to
 * `canvas.toBlob`. Pure. */
export function clampQuality(quality: number, fallback = 80): number {
  if (!Number.isFinite(quality)) return fallback;
  return Math.min(100, Math.max(1, Math.round(quality)));
}

/** Formats a byte count as a short human-readable string, e.g. "1.2 MB",
 * "340 KB", "512 B". Pure. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

/** Computes the percentage size reduction from an original byte count to a
 * compressed one, e.g. 1_200_000 -> 340_000 is 72 ("72% smaller"). Clamped
 * to 0 when the "compressed" file is actually larger (or original is 0/
 * invalid), so the UI never shows a negative or NaN/Infinity percentage.
 * Pure. */
export function computeSizeReductionPercent(originalBytes: number, compressedBytes: number): number {
  if (!Number.isFinite(originalBytes) || originalBytes <= 0 || !Number.isFinite(compressedBytes)) return 0;
  const reduction = ((originalBytes - compressedBytes) / originalBytes) * 100;
  return Math.max(0, Math.round(reduction));
}

/** Maps a canvas-exportable MIME type to its conventional file extension,
 * for building download filenames. Pure. */
export function mimeToExtension(mime: CanvasMimeType): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default: {
      const exhaustive: never = mime;
      return exhaustive;
    }
  }
}

/** Computes the decoded byte length of a base64 data URL without decoding
 * it, by inspecting the base64 payload length and its `=` padding. Used to
 * report compressed file size without needing to re-fetch/re-decode the
 * blob. Pure. */
export function dataUrlByteLength(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return 0;
  const base64 = dataUrl.slice(commaIndex + 1);
  if (base64.length === 0) return 0;
  const paddingMatch = base64.match(/=+$/);
  const padding = paddingMatch ? paddingMatch[0].length : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/** Loads a `File` into a drawable image source. Prefers `createImageBitmap`
 * (no `<img>` element or object-URL bookkeeping needed) and falls back to
 * an `HTMLImageElement` + object URL for environments without it.
 * DOM/Canvas-dependent — not unit-tested, see module comment. */
export async function loadImageSource(file: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    return await loadImageElement(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Loads an image source (data URL, blob URL, or any URL string) into an
 * `HTMLImageElement` and resolves once it's decoded. DOM-dependent — not
 * unit-tested, see module comment. */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image data."));
    img.src = src;
  });
}

/** Draws an already-loaded image source onto an offscreen canvas at the
 * given dimensions and exports it via `canvas.toBlob`, returning a data
 * URL. Optionally fills a background color first (needed when exporting to
 * a format without alpha support, e.g. JPEG, from a source with
 * transparency). DOM/Canvas-dependent — not unit-tested, see module
 * comment. */
export async function drawAndExport(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  mimeType: CanvasMimeType,
  quality: number,
  backgroundColor?: string,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is not available in this browser.");

  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(source, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality / 100);
  });
  if (!blob) throw new Error("Failed to encode the image. The browser's canvas encoder returned no data.");
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read the encoded image."));
    reader.readAsDataURL(blob);
  });
}
