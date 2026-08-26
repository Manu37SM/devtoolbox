export interface ColorFormats {
  hex: string;
  rgb: string;
  hsl: string;
  cmyk: string;
  error: string | null;
}

const EMPTY: ColorFormats = { hex: "", rgb: "", hsl: "", cmyk: "", error: null };

export function convertColor(input: string): ColorFormats {
  const trimmed = input.trim();
  if (trimmed.length === 0) return EMPTY;

  const rgb = parseColor(trimmed);
  if (!rgb) {
    return { ...EMPTY, error: `Could not parse "${input}" as a hex, rgb(), or hsl() color.` };
  }

  const [r, g, b] = rgb;
  return {
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: rgbToHslString(r, g, b),
    cmyk: rgbToCmykString(r, g, b),
    error: null,
  };
}

function parseColor(input: string): [number, number, number] | null {
  const hexMatch = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(input);
  if (hexMatch) {
    const hex = hexMatch[1]!;
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  }

  const rgbMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(input);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }

  const hslMatch = /^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/i.exec(input);
  if (hslMatch) {
    return hslToRgb(Number(hslMatch[1]), Number(hslMatch[2]), Number(hslMatch[3]));
  }

  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

function rgbToHslString(r: number, g: number, b: number): string {
  const [h, s, l] = rgbToHsl(r, g, b);
  return `hsl(${h}, ${s}%, ${l}%)`;
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

function rgbToCmykString(r: number, g: number, b: number): string {
  if (r === 0 && g === 0 && b === 0) return "cmyk(0%, 0%, 0%, 100%)";
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);
  return `cmyk(${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`;
}
