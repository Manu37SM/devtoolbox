import { describe, expect, it } from "vitest";
import { generateHmac } from "./transform";

describe("generateHmac", () => {
  it("computes HMAC-SHA256 hex (RFC 4231 test case 1)", async () => {
    const key = Buffer.alloc(20, 0x0b).toString("binary");
    const result = await generateHmac("Hi There", key, { algorithm: "SHA-256", outputFormat: "hex" });
    expect(result.error).toBeNull();
    expect(result.output).toBe(
      "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
    );
  });

  it("computes HMAC-SHA1 hex", async () => {
    const result = await generateHmac("hello", "secret", { algorithm: "SHA-1", outputFormat: "hex" });
    expect(result.error).toBeNull();
    expect(result.output).toHaveLength(40);
  });

  it("computes HMAC-SHA384 hex", async () => {
    const result = await generateHmac("hello", "secret", { algorithm: "SHA-384", outputFormat: "hex" });
    expect(result.output).toHaveLength(96);
  });

  it("computes HMAC-SHA512 hex", async () => {
    const result = await generateHmac("hello", "secret", { algorithm: "SHA-512", outputFormat: "hex" });
    expect(result.output).toHaveLength(128);
  });

  it("outputs base64 when requested", async () => {
    const result = await generateHmac("hello", "secret", { algorithm: "SHA-256", outputFormat: "base64" });
    expect(result.error).toBeNull();
    expect(result.output).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("produces different output for different secrets", async () => {
    const a = await generateHmac("hello", "secret1", { algorithm: "SHA-256", outputFormat: "hex" });
    const b = await generateHmac("hello", "secret2", { algorithm: "SHA-256", outputFormat: "hex" });
    expect(a.output).not.toBe(b.output);
  });

  it("returns empty output for empty message", async () => {
    const result = await generateHmac("", "secret", { algorithm: "SHA-256", outputFormat: "hex" });
    expect(result).toEqual({ output: "", error: null });
  });

  it("errors when secret is empty", async () => {
    const result = await generateHmac("hello", "", { algorithm: "SHA-256", outputFormat: "hex" });
    expect(result.output).toBe("");
    expect(result.error?.message).toBeTruthy();
  });

  it("is deterministic for the same input", async () => {
    const a = await generateHmac("hello world", "mykey", { algorithm: "SHA-256", outputFormat: "hex" });
    const b = await generateHmac("hello world", "mykey", { algorithm: "SHA-256", outputFormat: "hex" });
    expect(a.output).toBe(b.output);
  });
});
