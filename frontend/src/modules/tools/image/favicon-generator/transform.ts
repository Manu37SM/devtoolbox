import JSZip from "jszip";
import type { FaviconGeneratorOptions } from "./schema";

export interface GeneratedFaviconImage {
  size: number;
  dataUrl: string;
  blob: Blob;
}

export interface GenerateFaviconsResult {
  images: GeneratedFaviconImage[];
  error: string | null;
}

type Look = Pick<FaviconGeneratorOptions, "padding" | "background" | "cornerRadius" | "fit">;

/** Where to draw a srcW×srcH image inside a size×size icon. */
export function iconLayout(
  srcW: number,
  srcH: number,
  size: number,
  padding = 0,
  fit: FaviconGeneratorOptions["fit"] = "contain",
): { dx: number; dy: number; dw: number; dh: number } {
  const inner = size * (1 - (2 * padding) / 100);
  const scale = fit === "cover" ? Math.max(inner / srcW, inner / srcH) : Math.min(inner / srcW, inner / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  return { dx: (size - dw) / 2, dy: (size - dh) / 2, dw, dh };
}

function roundedRect(ctx: CanvasRenderingContext2D, size: number, radiusPct: number): void {
  const r = (size * radiusPct) / 100;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(size, 0, size, size, r);
  ctx.arcTo(size, size, 0, size, r);
  ctx.arcTo(0, size, 0, 0, r);
  ctx.arcTo(0, 0, size, 0, r);
  ctx.closePath();
}

export async function generateFavicons(file: File, sizes: number[], look: Partial<Look> = {}): Promise<GenerateFaviconsResult> {
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

      const radius = look.cornerRadius ?? 0;
      if (radius > 0) {
        roundedRect(ctx, size, radius);
        ctx.clip();
      }
      // iOS renders transparent apple-touch-icons on black, so 180 px always gets a fill.
      const bg = look.background || (size === 180 ? "#ffffff" : "");
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
      }
      const { dx, dy, dw, dh } = iconLayout(bitmap.width, bitmap.height, size, look.padding ?? 0, look.fit ?? "contain");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, dx, dy, dw, dh);

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

/**
 * Packs PNG images into a .ico file (PNG-compressed entries, supported by every browser
 * and Windows Vista+). Sizes above 255 are stored with the "0 means 256" convention.
 */
export function buildIco(entries: Array<{ size: number; png: Uint8Array }>): Uint8Array {
  const header = 6 + 16 * entries.length;
  const total = header + entries.reduce((n, e) => n + e.png.length, 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0, true);
  v.setUint16(2, 1, true); // type 1 = icon
  v.setUint16(4, entries.length, true);
  let offset = header;
  entries.forEach((e, i) => {
    const p = 6 + 16 * i;
    v.setUint8(p, e.size >= 256 ? 0 : e.size);
    v.setUint8(p + 1, e.size >= 256 ? 0 : e.size);
    v.setUint8(p + 2, 0); // palette colours
    v.setUint8(p + 3, 0);
    v.setUint16(p + 4, 1, true); // colour planes
    v.setUint16(p + 6, 32, true); // bits per pixel
    v.setUint32(p + 8, e.png.length, true);
    v.setUint32(p + 12, offset, true);
    out.set(e.png, offset);
    offset += e.png.length;
  });
  return out;
}

export function webManifest(appName: string, themeColor: string): string {
  return JSON.stringify(
    {
      name: appName,
      short_name: appName.slice(0, 12),
      icons: [
        { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      theme_color: themeColor,
      background_color: themeColor,
      display: "standalone",
    },
    null,
    2,
  );
}

export const HEAD_SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
`;

export async function bundleFaviconsAsZip(
  images: Array<{ size: number; blob: Blob }>,
  extras?: { full: boolean; appName?: string; themeColor?: string },
): Promise<Blob> {
  const zip = new JSZip();
  const bytes = new Map<number, Uint8Array>();
  for (const { size, blob } of images) {
    const b = new Uint8Array(await blob.arrayBuffer());
    bytes.set(size, b);
    zip.file(`favicon-${size}x${size}.png`, b);
  }
  if (extras?.full) {
    const ico = [16, 32, 48].filter((s) => bytes.has(s)).map((s) => ({ size: s, png: bytes.get(s)! }));
    if (ico.length) zip.file("favicon.ico", buildIco(ico));
    if (bytes.has(180)) zip.file("apple-touch-icon.png", bytes.get(180)!);
    if (bytes.has(192)) zip.file("android-chrome-192x192.png", bytes.get(192)!);
    if (bytes.has(512)) zip.file("android-chrome-512x512.png", bytes.get(512)!);
    zip.file("site.webmanifest", webManifest(extras.appName || "My App", extras.themeColor || "#ffffff"));
    zip.file("head-snippet.html", HEAD_SNIPPET);
  }
  const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
  return new Blob([zipArrayBuffer], { type: "application/zip" });
}
