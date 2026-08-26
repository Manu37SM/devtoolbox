

export type CanvasMimeType = "image/png" | "image/jpeg" | "image/webp";

export function clampQuality(quality: number, fallback = 80): number {
  if (!Number.isFinite(quality)) return fallback;
  return Math.min(100, Math.max(1, Math.round(quality)));
}

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

export function computeSizeReductionPercent(originalBytes: number, compressedBytes: number): number {
  if (!Number.isFinite(originalBytes) || originalBytes <= 0 || !Number.isFinite(compressedBytes)) return 0;
  const reduction = ((originalBytes - compressedBytes) / originalBytes) * 100;
  return Math.max(0, Math.round(reduction));
}

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

export function dataUrlByteLength(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return 0;
  const base64 = dataUrl.slice(commaIndex + 1);
  if (base64.length === 0) return 0;
  const paddingMatch = base64.match(/=+$/);
  const padding = paddingMatch?.[0]?.length ?? 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

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

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image data."));
    img.src = src;
  });
}

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
