import { describe, expect, it } from "vitest";
import { generateQrCode, buildWifiPayload, buildVCardPayload, qrContrastWarning } from "./transform";

const base = { errorCorrectionLevel: "M" as const, margin: 2, scale: 6, darkColor: "#000000", lightColor: "#ffffff", transparentBackground: false };

describe("generateQrCode", () => {
  it("generates a PNG data URL for text input", async () => {
    const result = await generateQrCode("https://example.com", base);
    expect(result.error).toBeNull();
    expect(result.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain('fill="#ffffff"');
  });

  it("drops the background fill when transparent", async () => {
    const result = await generateQrCode("hi", { ...base, transparentBackground: true });
    expect(result.svg).not.toContain('fill="#ffffff"');
  });

  it("returns empty result for empty input", async () => {
    const result = await generateQrCode("", base);
    expect(result).toEqual({ dataUrl: "", error: null });
  });

  it("errors when input exceeds QR code capacity", async () => {
    const hugeInput = "a".repeat(5000);
    const result = await generateQrCode(hugeInput, base);
    expect(result.dataUrl).toBe("");
    expect(result.error).not.toBeNull();
  });
});

describe("buildWifiPayload", () => {
  it("builds a WIFI: payload string", () => {
    const payload = buildWifiPayload({ ssid: "MyNet", password: "secret123", encryption: "WPA", hidden: false });
    expect(payload).toBe("WIFI:T:WPA;S:MyNet;P:secret123;H:false;;");
  });

  it("escapes special characters in SSID/password", () => {
    const payload = buildWifiPayload({ ssid: 'a;b', password: "p:w", encryption: "WPA", hidden: true });
    expect(payload).toBe("WIFI:T:WPA;S:a\\;b;P:p\\:w;H:true;;");
  });
});

describe("buildVCardPayload", () => {
  it("builds a minimal vCard payload", () => {
    const payload = buildVCardPayload({ name: "Jane Doe", phone: "555-1234", email: "jane@example.com", org: "Acme" });
    expect(payload).toBe(
      "BEGIN:VCARD\nVERSION:3.0\nN:Jane Doe\nFN:Jane Doe\nORG:Acme\nTEL:555-1234\nEMAIL:jane@example.com\nEND:VCARD",
    );
  });

  it("omits empty optional fields", () => {
    const payload = buildVCardPayload({ name: "Jane Doe", phone: "", email: "", org: "" });
    expect(payload).toBe("BEGIN:VCARD\nVERSION:3.0\nN:Jane Doe\nFN:Jane Doe\nEND:VCARD");
  });
});

describe("qrContrastWarning", () => {
  it("accepts dark-on-light and flags inverted or faint colours", () => {
    expect(qrContrastWarning("#000000", "#ffffff")).toBeNull();
    expect(qrContrastWarning("#1e3a8a", "#ffffff")).toBeNull();
    expect(qrContrastWarning("#ffffff", "#000000")).toContain("Inverted");
    expect(qrContrastWarning("#999999", "#ffffff")).toContain("Low contrast");
  });
});

