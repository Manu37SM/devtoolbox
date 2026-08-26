import type { TransformResult } from "@/lib/tool-transform";
import type { PlaceholderImageOptions } from "./schema";

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generatePlaceholderImage(options: PlaceholderImageOptions): TransformResult {
  if (!Number.isInteger(options.width) || options.width < 1 || options.width > 4000) {
    return { output: "", error: { message: "Width must be an integer between 1 and 4000." } };
  }
  if (!Number.isInteger(options.height) || options.height < 1 || options.height > 4000) {
    return { output: "", error: { message: "Height must be an integer between 1 and 4000." } };
  }
  if (!HEX_PATTERN.test(options.backgroundColor)) {
    return { output: "", error: { message: `"${options.backgroundColor}" is not a valid hex color.` } };
  }
  if (!HEX_PATTERN.test(options.textColor)) {
    return { output: "", error: { message: `"${options.textColor}" is not a valid hex color.` } };
  }

  const label = escapeSvgText(options.text?.trim() || `${options.width}×${options.height}`);
  const fontSize = Math.max(10, Math.round(Math.min(options.width, options.height) / 8));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" role="img" aria-label="${label}">
  <rect width="100%" height="100%" fill="${options.backgroundColor}"/>
  <text x="50%" y="50%" fill="${options.textColor}" font-family="sans-serif" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;

  return { output: svg, error: null };
}

export function placeholderImageToDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return `data:image/svg+xml,${encoded}`;
}
