import QRCode from "qrcode";
import type { QrCodeGeneratorOptions } from "./schema";

export interface QrCodeResult {
  dataUrl: string;
  /** Same code as scalable SVG markup (empty on error/empty input). */
  svg?: string;
  error: string | null;
}

export async function generateQrCode(text: string, options: QrCodeGeneratorOptions): Promise<QrCodeResult> {
  if (text.length === 0) return { dataUrl: "", error: null };

  try {
    const render = {
      errorCorrectionLevel: options.errorCorrectionLevel,
      margin: options.margin,
      scale: options.scale,
      // 8-digit hex with alpha 00 makes the light modules transparent.
      color: { dark: options.darkColor, light: options.transparentBackground ? "#ffffff00" : options.lightColor },
    };
    const dataUrl = await QRCode.toDataURL(text, render);
    const svg = await QRCode.toString(text, { ...render, type: "svg" });
    return { dataUrl, svg, error: null };
  } catch (err) {
    return { dataUrl: "", error: err instanceof Error ? err.message : "Could not generate a QR code for this input." };
  }
}

export function buildWifiPayload(options: {
  ssid: string;
  password: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}): string {
  const escape = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:${options.encryption};S:${escape(options.ssid)};P:${escape(options.password)};H:${options.hidden ? "true" : "false"};;`;
}

export function buildVCardPayload(options: { name: string; phone: string; email: string; org: string }): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${options.name}`,
    `FN:${options.name}`,
    options.org ? `ORG:${options.org}` : "",
    options.phone ? `TEL:${options.phone}` : "",
    options.email ? `EMAIL:${options.email}` : "",
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\n");
}

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

/**
 * Many phone scanners only read dark-on-light codes with decent contrast.
 * Returns a warning for inverted or low-contrast colour pairs (WCAG ratio below 4.5).
 */
export function qrContrastWarning(dark: string, light: string): string | null {
  const d = luminance(dark);
  const l = luminance(light);
  if (d === null || l === null) return null;
  if (d > l) return "Inverted colours (light modules on dark): many scanners will not read this.";
  const ratio = (l + 0.05) / (d + 0.05);
  if (ratio < 4.5) return `Low contrast (${ratio.toFixed(1)}:1) - aim for at least 4.5:1 so the code scans reliably.`;
  return null;
}
