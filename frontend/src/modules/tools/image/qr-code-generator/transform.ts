import QRCode from "qrcode";
import type { QrCodeGeneratorOptions } from "./schema";

export interface QrCodeResult {
  dataUrl: string;
  error: string | null;
}

/** Generates a QR code as a PNG data URL using the `qrcode` library
 * (approved per ARCHITECTURE.md §8.2 — hand-rolling Reed-Solomon error
 * correction and the QR matrix layout algorithm is not a reasonable
 * from-scratch implementation). Async since `qrcode`'s toDataURL is
 * promise-based; still side-effect-free otherwise. */
export async function generateQrCode(text: string, options: QrCodeGeneratorOptions): Promise<QrCodeResult> {
  if (text.length === 0) return { dataUrl: "", error: null };

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: options.errorCorrectionLevel,
      margin: options.margin,
      scale: options.scale,
      color: { dark: options.darkColor, light: options.lightColor },
    });
    return { dataUrl, error: null };
  } catch (err) {
    return { dataUrl: "", error: err instanceof Error ? err.message : "Could not generate a QR code for this input." };
  }
}

/** Builds a `WIFI:` payload string for the WiFi QR code variant
 * (FEATURE.md: "incl. WiFi/vCard"). Pure string formatting, no I/O. */
export function buildWifiPayload(options: {
  ssid: string;
  password: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}): string {
  const escape = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:${options.encryption};S:${escape(options.ssid)};P:${escape(options.password)};H:${options.hidden ? "true" : "false"};;`;
}

/** Builds a minimal vCard 3.0 payload string for the vCard QR code
 * variant. */
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
