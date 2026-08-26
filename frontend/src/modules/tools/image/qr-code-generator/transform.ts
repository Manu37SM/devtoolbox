import QRCode from "qrcode";
import type { QrCodeGeneratorOptions } from "./schema";

export interface QrCodeResult {
  dataUrl: string;
  error: string | null;
}

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
