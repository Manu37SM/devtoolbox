import type { ColorPaletteGeneratorOptions } from "./schema";

export interface PaletteColor {
  hex: string;
  h: number;
  s: number;
  l: number;
}

export interface PaletteResult {
  output: string;
  colors: PaletteColor[];
  error: { message: string } | null;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const h = match[1]!;
  const full = h.length === 3
    ? h
        .split("")
        .map((c) => c + c)
        .join("")
    : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / d + 2) * 60;
        break;
      default:
        h = ((rn - gn) / d + 4) * 60;
    }
  }

  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function clampLightness(l: number): number {
  return Math.max(4, Math.min(96, Math.round(l)));
}

function makeColor(h: number, s: number, l: number): PaletteColor {
  const hue = normalizeHue(h);
  const lightness = clampLightness(l);
  const [r, g, b] = hslToRgb(hue, s, lightness);
  return { hex: rgbToHex(r, g, b), h: hue, s, l: lightness };
}

function shadesPalette(h: number, s: number, count: number): PaletteColor[] {
  const minL = 12;
  const maxL = 88;
  const colors: PaletteColor[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    colors.push(makeColor(h, s, minL + t * (maxL - minL)));
  }
  return colors;
}

function analogousPalette(h: number, s: number, l: number, count: number, step = 30): PaletteColor[] {
  const offsets: number[] = [0];
  let n = 1;
  while (offsets.length < count) {
    offsets.push(step * n);
    if (offsets.length < count) offsets.push(-step * n);
    n++;
  }
  return offsets.slice(0, count).map((offset) => makeColor(h + offset, s, l));
}

function cyclicHuePalette(h: number, s: number, l: number, count: number, offsets: number[]): PaletteColor[] {
  const colors: PaletteColor[] = [];
  for (let i = 0; i < count; i++) {
    const offset = offsets[i % offsets.length]!;
    const cycle = Math.floor(i / offsets.length);
    const lightness = l + cycle * 12 * (cycle % 2 === 0 ? 1 : -1);
    colors.push(makeColor(h + offset, s, lightness));
  }
  return colors;
}

export function generatePalette(baseHex: string, options: ColorPaletteGeneratorOptions): PaletteResult {
  const rgb = hexToRgb(baseHex);
  if (!rgb) {
    return { output: "", colors: [], error: { message: `"${baseHex}" is not a valid hex color.` } };
  }

  const [r, g, b] = rgb;
  const [h, s, l] = rgbToHsl(r, g, b);
  const count = Math.max(2, Math.min(10, Math.round(options.count)));

  let colors: PaletteColor[];
  switch (options.scheme) {
    case "monochromatic":
    case "shades":
      colors = shadesPalette(h, s, count);
      break;
    case "analogous":
      colors = analogousPalette(h, s, l, count, 30);
      break;
    case "complementary":
      colors = cyclicHuePalette(h, s, l, count, [0, 180]);
      break;
    case "triadic":
      colors = cyclicHuePalette(h, s, l, count, [0, 120, 240]);
      break;
    case "tetradic":
      colors = cyclicHuePalette(h, s, l, count, [0, 90, 180, 270]);
      break;
  }

  return { output: colors.map((c) => c.hex).join("\n"), colors, error: null };
}
