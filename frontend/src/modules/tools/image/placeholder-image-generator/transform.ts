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

export function generatePlaceholderImage(
  options: Pick<PlaceholderImageOptions, "width" | "height" | "backgroundColor" | "textColor"> & Partial<PlaceholderImageOptions>,
): TransformResult {
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

  const { width: w, height: h } = options;
  const dims = `${w}×${h}`;
  const custom = options.text?.trim();
  const label = escapeSvgText(custom || dims);
  const fontSize = options.fontSize || Math.max(10, Math.round(Math.min(w, h) / 8));
  const r = Math.min(options.cornerRadius ?? 0, Math.floor(Math.min(w, h) / 2));
  const rx = r > 0 ? ` rx="${r}"` : "";

  const decoration: string[] = [];
  const stroke = `stroke="${options.textColor}" stroke-opacity="0.35" stroke-width="${Math.max(1, Math.round(Math.min(w, h) / 200))}"`;
  if (options.pattern === "cross") {
    decoration.push(`  <path d="M0 0L${w} ${h}M${w} 0L0 ${h}" ${stroke}/>`);
  } else if (options.pattern === "grid") {
    const step = Math.max(8, Math.round(Math.min(w, h) / 10));
    const lines: string[] = [];
    for (let x = step; x < w; x += step) lines.push(`M${x} 0V${h}`);
    for (let y = step; y < h; y += step) lines.push(`M0 ${y}H${w}`);
    decoration.push(`  <path d="${lines.join("")}" ${stroke}/>`);
  }
  const clip = r > 0 && decoration.length ? ` clip-path="url(#c)"` : "";
  const defs = clip ? `  <defs><clipPath id="c"><rect width="${w}" height="${h}"${rx}/></clipPath></defs>\n` : "";
  const second = custom && options.showDimensions;
  const text = second
    ? `  <text x="50%" y="50%" fill="${options.textColor}" font-family="sans-serif" font-size="${fontSize}" text-anchor="middle">${label}</text>
  <text x="50%" y="50%" dy="${Math.round(fontSize * 1.1)}" fill="${options.textColor}" fill-opacity="0.8" font-family="sans-serif" font-size="${Math.round(fontSize * 0.6)}" text-anchor="middle">${dims}</text>`
    : `  <text x="50%" y="50%" fill="${options.textColor}" font-family="sans-serif" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${label}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
${defs}  <rect width="100%" height="100%" fill="${options.backgroundColor}"${rx}/>
${decoration.length ? (clip ? `  <g${clip}>\n${decoration.join("\n")}\n  </g>\n` : `${decoration.join("\n")}\n`) : ""}${text}
</svg>`;

  return { output: svg, error: null };
}

export function placeholderImageToDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return `data:image/svg+xml,${encoded}`;
}
