import { CSS_NAMED_COLORS } from "@/lib/css-named-colors";
import type { ColorConverterOptions } from "./schema";

export interface ColorFormats {
  hex: string;
  rgb: string;
  hsl: string;
  cmyk: string;
  hsv?: string;
  hwb?: string;
  oklch?: string;
  /** Exact CSS name, or the closest one with "≈". */
  name?: string;
  /** Snippets for code: Android/Java ARGB int, Flutter, Swift, Compose. */
  code?: { label: string; value: string }[];
  /** CSS-renderable value for the preview swatch. */
  css?: string;
  error: string | null;
}

/** sRGB 0-255 channels plus alpha 0-1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const EMPTY: ColorFormats = { hex: "", rgb: "", hsl: "", cmyk: "", error: null };

export function convertColor(input: string, options: Partial<ColorConverterOptions> = {}): ColorFormats {
  const trimmed = input.trim();
  if (trimmed.length === 0) return EMPTY;

  const c = parseColor(trimmed);
  if (!c) {
    return { ...EMPTY, error: `Could not parse "${input}" as a hex, rgb(), hsl(), hwb(), oklch(), cmyk() or named color.` };
  }
  const o = { syntax: options.syntax ?? "legacy", uppercaseHex: options.uppercaseHex ?? false, precision: options.precision ?? 0 };
  const n = (v: number) => fmt(v, o.precision);
  const modern = o.syntax === "modern";
  const hasAlpha = c.a < 1;
  const alphaPart = (sepModern: string) => (hasAlpha ? (modern ? `${sepModern}${fmt(c.a * 100, 0)}%` : `, ${fmt(c.a, 3)}`) : "");
  const R = Math.round(c.r);
  const G = Math.round(c.g);
  const B = Math.round(c.b);

  let hex = "#" + [R, G, B].map((v) => v.toString(16).padStart(2, "0")).join("");
  if (hasAlpha) hex += Math.round(c.a * 255).toString(16).padStart(2, "0");
  if (o.uppercaseHex) hex = hex.toUpperCase();

  const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
  const [hv, sv, vv] = rgbToHsv(c.r, c.g, c.b);
  const fn = (name: string, parts: string[]) =>
    modern
      ? `${name}(${parts.join(" ")}${alphaPart(" / ")})`
      : `${name}${hasAlpha ? "a" : ""}(${parts.join(", ")}${alphaPart("")})`;

  const rgb = fn("rgb", [String(R), String(G), String(B)]);
  const hsl = fn("hsl", [n(h), `${n(s)}%`, `${n(l)}%`]);
  const hwb = `hwb(${n(hv)} ${n(((100 - sv) * vv) / 100)}% ${n(100 - vv)}%${hasAlpha ? ` / ${fmt(c.a * 100, 0)}%` : ""})`;
  const [L, C, H] = rgbToOklch(c.r, c.g, c.b);
  const oklch = `oklch(${fmt(L * 100, 2)}% ${fmt(C, 4)} ${C < 1e-4 ? "none" : fmt(H, 2)}${hasAlpha ? ` / ${fmt(c.a * 100, 0)}%` : ""})`;

  const argb = ((Math.round(c.a * 255) << 24) | (R << 16) | (G << 8) | B) >>> 0;
  const argbHex = argb.toString(16).padStart(8, "0").toUpperCase();
  const f3 = (v: number) => fmt(v / 255, 3);

  return {
    hex,
    rgb,
    hsl,
    cmyk: rgbToCmykString(c.r, c.g, c.b, o.precision),
    hsv: `hsv(${n(hv)}, ${n(sv)}%, ${n(vv)}%)`,
    hwb,
    oklch,
    name: nearestName(R, G, B),
    code: [
      { label: "Android / Java int (ARGB)", value: `0x${argbHex}` },
      { label: "Java AWT", value: `new Color(${R}, ${G}, ${B}${hasAlpha ? `, ${Math.round(c.a * 255)}` : ""})` },
      { label: "Flutter / Compose", value: `Color(0x${argbHex})` },
      { label: "SwiftUI", value: `Color(red: ${f3(R)}, green: ${f3(G)}, blue: ${f3(B)}${hasAlpha ? `, opacity: ${fmt(c.a, 3)}` : ""})` },
      { label: "Decimal (0xRRGGBB)", value: String((R << 16) | (G << 8) | B) },
    ],
    css: hasAlpha ? `rgba(${R}, ${G}, ${B}, ${c.a})` : `rgb(${R}, ${G}, ${B})`,
    error: null,
  };
}

function fmt(v: number, dp: number): string {
  const r = Number(v.toFixed(dp));
  return String(Object.is(r, -0) ? 0 : r);
}

// ------------------------------------------------------------------ parsing

const NUM = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?`;

/** Splits "a, b, c" or "a b c / d" into components. */
function args(body: string, components = 3): { parts: string[]; alpha?: string } | null {
  const slash = body.split("/");
  if (slash.length > 2) return null;
  const parts = slash[0]!.trim().split(/\s*,\s*|\s+/).filter(Boolean);
  let alpha = slash[1]?.trim();
  // Legacy rgba(r, g, b, a): a fourth comma-separated value is the alpha.
  if (alpha === undefined && parts.length === components + 1) alpha = parts.pop();
  return { parts, alpha };
}

function num(s: string | undefined, percentOf: number): number | null {
  if (s === undefined) return null;
  if (s === "none") return 0;
  const m = new RegExp(`^(${NUM})(%|deg|rad|grad|turn)?$`, "i").exec(s);
  if (!m) return null;
  const v = Number(m[1]);
  switch (m[2]?.toLowerCase()) {
    case "%":
      return (v / 100) * percentOf;
    case "rad":
      return (v * 180) / Math.PI;
    case "grad":
      return v * 0.9;
    case "turn":
      return v * 360;
    default:
      return v;
  }
}

function alphaOf(s: string | undefined): number | null {
  if (s === undefined) return 1;
  const v = num(s, 1);
  return v === null ? null : clamp(v, 0, 1);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const named = CSS_NAMED_COLORS[s];
  if (named !== undefined) return { r: (named >> 16) & 255, g: (named >> 8) & 255, b: named & 255, a: 1 };

  const hexMatch = /^(?:#|0x)?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hexMatch) {
    let hex = hexMatch[1]!;
    if (hex.length <= 4) hex = hex.split("").map((c) => c + c).join("");
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }

  const fnMatch = /^([a-z]+)\((.*)\)$/.exec(s);
  if (!fnMatch) return null;
  const a = args(fnMatch[2]!, fnMatch[1]!.endsWith("cmyk") ? 4 : 3);
  if (!a || a.parts.length < 3) return null;
  const alpha = alphaOf(a.alpha);
  if (alpha === null) return null;
  const [p1, p2, p3, p4] = a.parts;

  switch (fnMatch[1]) {
    case "rgb":
    case "rgba": {
      const r = num(p1, 255);
      const g = num(p2, 255);
      const b = num(p3, 255);
      if (r === null || g === null || b === null) return null;
      return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: alpha };
    }
    case "hsl":
    case "hsla": {
      const h = num(p1, 360);
      const sat = num(p2?.endsWith("%") ? p2 : `${p2}%`, 100);
      const l = num(p3?.endsWith("%") ? p3 : `${p3}%`, 100);
      if (h === null || sat === null || l === null) return null;
      const [r, g, b] = hslToRgb(((h % 360) + 360) % 360, clamp(sat, 0, 100), clamp(l, 0, 100));
      return { r, g, b, a: alpha };
    }
    case "hwb": {
      const h = num(p1, 360);
      let w = num(p2, 100);
      let bl = num(p3, 100);
      if (h === null || w === null || bl === null) return null;
      w /= 100;
      bl /= 100;
      if (w + bl >= 1) {
        const gray = (w / (w + bl)) * 255;
        return { r: gray, g: gray, b: gray, a: alpha };
      }
      const [r, g, b] = hslToRgb(((h % 360) + 360) % 360, 100, 50);
      const mix = (v: number) => v * (1 - w - bl) + w * 255;
      return { r: mix(r), g: mix(g), b: mix(b), a: alpha };
    }
    case "oklch": {
      const L = num(p1, 1);
      const C = num(p2, 0.4);
      const H = num(p3, 360);
      if (L === null || C === null || H === null) return null;
      const [r, g, b] = oklchToRgb(L, C, H);
      return { r, g, b, a: alpha };
    }
    case "cmyk":
    case "device-cmyk": {
      const v = [p1, p2, p3, p4].map((x) => num(x, 1));
      if (v.some((x) => x === null)) return null;
      // Bare numbers above 1 are read as percentages: cmyk(0, 100, 100, 0).
      const [cc, m, y, k] = v.map((x) => (x! > 1 ? x! / 100 : x!)) as [number, number, number, number];
      return { r: 255 * (1 - cc) * (1 - k), g: 255 * (1 - m) * (1 - k), b: 255 * (1 - y) * (1 - k), a: alpha };
    }
    default:
      return null;
  }
}

// ------------------------------------------------------------------ conversions

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
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return [h, s * 100, l * 100];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const [h] = rgbToHsl(r, g, b);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return [h, max === 0 ? 0 : ((max - min) / max) * 100, max * 100];
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

function rgbToCmykString(r: number, g: number, b: number, dp = 0): string {
  if (r === 0 && g === 0 && b === 0) return "cmyk(0%, 0%, 0%, 100%)";
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);
  return `cmyk(${fmt(c * 100, dp)}%, ${fmt(m * 100, dp)}%, ${fmt(y * 100, dp)}%, ${fmt(k * 100, dp)}%)`;
}

const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** sRGB -> OKLCH (Björn Ottosson's OKLab). L is 0-1. */
export function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const hr = (H * Math.PI) / 180;
  const A = C * Math.cos(hr);
  const B = C * Math.sin(hr);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  // Out-of-gamut colours are clipped to sRGB.
  return lin.map((v) => clamp(v <= 0.0031308 ? 255 * 12.92 * v : 255 * (1.055 * v ** (1 / 2.4) - 0.055), 0, 255)) as [number, number, number];
}

/** Exact CSS name, or the perceptually closest one (OKLab distance) prefixed with "≈ ". */
function nearestName(r: number, g: number, b: number): string {
  const target = (r << 16) | (g << 8) | b;
  let best = "";
  let bestD = Infinity;
  const [L1, C1, H1] = rgbToOklch(r, g, b);
  const a1 = C1 * Math.cos((H1 * Math.PI) / 180);
  const b1 = C1 * Math.sin((H1 * Math.PI) / 180);
  for (const [name, v] of Object.entries(CSS_NAMED_COLORS)) {
    if (v === target) return name;
    const [L2, C2, H2] = rgbToOklch((v >> 16) & 255, (v >> 8) & 255, v & 255);
    const d = (L1 - L2) ** 2 + (a1 - C2 * Math.cos((H2 * Math.PI) / 180)) ** 2 + (b1 - C2 * Math.sin((H2 * Math.PI) / 180)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return `≈ ${best}`;
}
