import { loadImageSource } from "@/lib/image-canvas";
import type { ColorBlindnessType } from "./schema";

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

export function simulateColorBlindness(color: RgbColor, type: ColorBlindnessType): RgbColor {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = COLOR_BLINDNESS_MATRICES[type];
  return {
    r: clamp255(color.r * m00 + color.g * m01 + color.b * m02),
    g: clamp255(color.r * m10 + color.g * m11 + color.b * m12),
    b: clamp255(color.r * m20 + color.g * m21 + color.b * m22),
  };
}

export function applyColorBlindnessToImageData(imageData: ImageData, type: ColorBlindnessType): void {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const result = simulateColorBlindness({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! }, type);
    data[i] = result.r;
    data[i + 1] = result.g;
    data[i + 2] = result.b;
  }
}

export interface ColorBlindnessSimulatorResult {
  dataUrl: string;
  error: string | null;
}

export async function simulateColorBlindnessOnImage(
  file: File,
  type: ColorBlindnessType,
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
    applyColorBlindnessToImageData(imageData, type);
    ctx.putImageData(imageData, 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), error: null };
  } catch (err) {
    return { dataUrl: "", error: err instanceof Error ? err.message : "Could not process this image." };
  }
}
