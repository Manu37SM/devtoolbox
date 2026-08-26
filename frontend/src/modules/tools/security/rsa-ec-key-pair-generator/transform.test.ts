import { describe, expect, it } from "vitest";
import { derToPem, generateKeyPairPem } from "./transform";

describe("derToPem", () => {
  it("wraps bytes in PEM armor with 64-char line wrapping", () => {
    const bytes = new Uint8Array(100).fill(65);
    const pem = derToPem(bytes.buffer, "PUBLIC KEY");
    expect(pem.startsWith("-----BEGIN PUBLIC KEY-----\n")).toBe(true);
    expect(pem.endsWith("-----END PUBLIC KEY-----")).toBe(true);
    const bodyLines = pem.split("\n").slice(1, -1);
    for (const line of bodyLines.slice(0, -1)) {
      expect(line.length).toBe(64);
    }
  });
});

describe("generateKeyPairPem — RSA", () => {
  it("generates a valid PEM-armored RSA key pair", async () => {
    const result = await generateKeyPairPem({ keyType: "rsa", rsaModulusLength: 2048, ecCurve: "P-256" });
    expect(result.error).toBeNull();
    expect(result.publicKeyPem).toContain("-----BEGIN PUBLIC KEY-----");
    expect(result.privateKeyPem).toContain("-----BEGIN PRIVATE KEY-----");
  }, 15000);
});

describe("generateKeyPairPem — EC", () => {
  it("generates a valid PEM-armored EC key pair for each supported curve", async () => {
    for (const ecCurve of ["P-256", "P-384", "P-521"] as const) {
      const result = await generateKeyPairPem({ keyType: "ec", rsaModulusLength: 2048, ecCurve });
      expect(result.error).toBeNull();
      expect(result.publicKeyPem).toContain("-----BEGIN PUBLIC KEY-----");
      expect(result.privateKeyPem).toContain("-----BEGIN PRIVATE KEY-----");
    }
  }, 15000);
});
