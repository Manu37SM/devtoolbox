import type { TransformResult } from "@/lib/tool-transform";
import type { BoxShadowBorderRadiusOptions } from "./schema";

export function hexToRgba(hex: string, opacityPercent: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const a = Math.round(Math.max(0, Math.min(100, opacityPercent))) / 100;
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
}

export function generateBoxShadowBorderRadiusCss(options: BoxShadowBorderRadiusOptions): TransformResult {
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(options.color)) {
    return { output: "", error: { message: `"${options.color}" is not a valid hex color (e.g. #000000).` } };
  }
  if (options.borderRadius < 0) {
    return { output: "", error: { message: "Border radius can't be negative." } };
  }

  const rgba = hexToRgba(options.color, options.opacity);
  const shadow = `${options.inset ? "inset " : ""}${options.offsetX}px ${options.offsetY}px ${options.blur}px ${options.spread}px ${rgba}`;
  const css = `box-shadow: ${shadow};\nborder-radius: ${options.borderRadius}px;`;

  return { output: css, error: null };
}
