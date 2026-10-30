import { loadImageSource } from "@/lib/image-canvas";
import type { ColorBlindnessSimulatorOptions, ColorBlindnessType } from "./schema";
import { MACHADO_MATRICES } from "./machado-matrices";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export const COLOR_BLINDNESS_MATRICES: Record<ColorBlindnessType, [number, number, number, number, number, number, number, number, number]> = {
  protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
  achromatopsia: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
};

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

type Model = Pick<ColorBlindnessSimulatorOptions, "model" | "severity">;

/** Machado matrix for a severity 0-100, interpolating between the published 10 % steps. */
export function machadoMatrix(type: Exclude<ColorBlindnessType, "achromatopsia">, severity: number): number[] {
  const table = MACHADO_MATRICES[type === "protanopia" ? "protan" : type === "deuteranopia" ? "deutan" : "tritan"];
  const s = Math.min(100, Math.max(0, severity)) / 10;
  const lo = Math.floor(s);
  const hi = Math.min(10, lo + 1);
  const t = s - lo;
  return table[lo]!.map((v, i) => v * (1 - t) + table[hi]![i]! * t);
}

const SRGB_TO_LINEAR = Array.from({ length: 256 }, (_, v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
function linearToSrgb(v: number): number {
  const c = Math.min(1, Math.max(0, v));
  return clamp255(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
}

function makePixelFn(type: ColorBlindnessType, model: Partial<Model>): (r: number, g: number, b: number) => [number, number, number] {
  const severity = model.severity ?? 100;
  if ((model.model ?? "machado") === "simple") {
    const full = COLOR_BLINDNESS_MATRICES[type];
    const m = full.map((v, i) => v * (severity / 100) + ([0, 4, 8].includes(i) ? 1 : 0) * (1 - severity / 100));
    return (r, g, b) => [
      clamp255(r * m[0]! + g * m[1]! + b * m[2]!),
      clamp255(r * m[3]! + g * m[4]! + b * m[5]!),
      clamp255(r * m[6]! + g * m[7]! + b * m[8]!),
    ];
  }
  if (type === "achromatopsia") {
    const k = severity / 100;
    return (r, g, b) => {
      const R = SRGB_TO_LINEAR[r]!;
      const G = SRGB_TO_LINEAR[g]!;
      const B = SRGB_TO_LINEAR[b]!;
      const y = 0.2126 * R + 0.7152 * G + 0.0722 * B; // relative luminance
      return [linearToSrgb(R + (y - R) * k), linearToSrgb(G + (y - G) * k), linearToSrgb(B + (y - B) * k)];
    };
  }
  const m = machadoMatrix(type, severity);
  return (r, g, b) => {
    const R = SRGB_TO_LINEAR[r]!;
    const G = SRGB_TO_LINEAR[g]!;
    const B = SRGB_TO_LINEAR[b]!;
    return [
      linearToSrgb(R * m[0]! + G * m[1]! + B * m[2]!),
      linearToSrgb(R * m[3]! + G * m[4]! + B * m[5]!),
      linearToSrgb(R * m[6]! + G * m[7]! + B * m[8]!),
    ];
  };
}

export function simulateColorBlindness(color: RgbColor, type: ColorBlindnessType, model: Partial<Model> = {}): RgbColor {
  const [r, g, b] = makePixelFn(type, model)(color.r, color.g, color.b);
  return { r, g, b };
}

export function applyColorBlindnessToImageData(imageData: ImageData, type: ColorBlindnessType, model: Partial<Model> = {}): void {
  const { data } = imageData;
  const fn = makePixelFn(type, model);
  // Photos repeat colours a lot; caching per 24-bit colour avoids redoing the maths.
  const cache = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
    let out = cache.get(key);
    if (out === undefined) {
      const [r, g, b] = fn(data[i]!, data[i + 1]!, data[i + 2]!);
      out = (r << 16) | (g << 8) | b;
      if (cache.size < 200_000) cache.set(key, out);
    }
    data[i] = (out >> 16) & 255;
    data[i + 1] = (out >> 8) & 255;
    data[i + 2] = out & 255;
  }
}

export interface ColorBlindnessSimulatorResult {
  dataUrl: string;
  error: string | null;
}

export async function simulateColorBlindnessOnImage(
  file: File,
  type: ColorBlindnessType,
  model: Partial<Model> = {},
): Promise<ColorBlindnessSimulatorResult> {
  try {
    const source = await loadImageSource(file);
    const width = "width" in source ? source.width : 0;
    const height = "height" in source ? source.height : 0;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is not available in this browser.");
    ctx.drawImage(source, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    applyColorBlindnessToImageData(imageData, type, model);
    ctx.putImageData(imageData, 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), error: null };
  } catch (err) {
    return { dataUrl: "", error: err instanceof Error ? err.message : "Could not process this image." };
  }
}
