import { describe, expect, it } from "vitest";
import { generateHmac } from "./transform";

describe("generateHmac", () => {
  it("computes HMAC-SHA256 hex (RFC 4231 test case 1)", async () => {
    const key = Buffer.alloc(20, 0x0b).toString("binary");
    const result = await generateHmac("Hi There", key, { algorithm: "SHA-256", outputFormat: "hex", keyFormat: "text" });
    expect(result.error).toBeNull();
    expect(result.output).toBe(
      "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
    );
  });

  it("computes HMAC-SHA1 hex", async () => {
    const result = await generateHmac("hello", "secret", { algorithm: "SHA-1", outputFormat: "hex", keyFormat: "text" });
    expect(result.error).toBeNull();
    expect(result.output).toHaveLength(40);
  });

  it("computes HMAC-SHA384 hex", async () => {
    const result = await generateHmac("hello", "secret", { algorithm: "SHA-384", outputFormat: "hex", keyFormat: "text" });
    expect(result.output).toHaveLength(96);
  });

  it("computes HMAC-SHA512 hex", async () => {
    const result = await generateHmac("hello", "secret", { algorithm: "SHA-512", outputFormat: "hex", keyFormat: "text" });
    expect(result.output).toHaveLength(128);
  });

  it("outputs base64 when requested", async () => {
    const result = await generateHmac("hello", "secret", { algorithm: "SHA-256", outputFormat: "base64", keyFormat: "text" });
    expect(result.error).toBeNull();
    expect(result.output).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("produces different output for different secrets", async () => {
    const a = await generateHmac("hello", "secret1", { algorithm: "SHA-256", outputFormat: "hex", keyFormat: "text" });
    const b = await generateHmac("hello", "secret2", { algorithm: "SHA-256", outputFormat: "hex", keyFormat: "text" });
    expect(a.output).not.toBe(b.output);
  });

  it("returns empty output for empty message", async () => {
    const result = await generateHmac("", "secret", { algorithm: "SHA-256", outputFormat: "hex", keyFormat: "text" });
    expect(result).toEqual({ output: "", error: null });
  });

  it("errors when secret is empty", async () => {
    const result = await generateHmac("hello", "", { algorithm: "SHA-256", outputFormat: "hex", keyFormat: "text" });
    expect(result.output).toBe("");
    expect(result.error?.message).toBeTruthy();
  });

  it("is deterministic for the same input", async () => {
    const a = await generateHmac("hello world", "mykey", { algorithm: "SHA-256", outputFormat: "hex", keyFormat: "text" });
    const b = await generateHmac("hello world", "mykey", { algorithm: "SHA-256", outputFormat: "hex", keyFormat: "text" });
    expect(a.output).toBe(b.output);
  });

  it("accepts the key as hex or Base64 bytes (RFC 4231 test case 1)", async () => {
    const expected = "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7";
    const hex = await generateHmac("Hi There", "0b".repeat(20), { algorithm: "SHA-256", outputFormat: "hex", keyFormat: "hex" });
    expect(hex.output).toBe(expected);
    const b64 = await generateHmac("Hi There", btoa("\x0b".repeat(20)), { algorithm: "SHA-256", outputFormat: "hex", keyFormat: "base64" });
    expect(b64.output).toBe(expected);
    expect((await generateHmac("x", "zz", { algorithm: "SHA-256", outputFormat: "hex", keyFormat: "hex" })).error?.message).toMatch(/not valid hex/);
  });

  it("outputs Base64URL without padding", async () => {
    const r = await generateHmac("hello", "secret", { algorithm: "SHA-256", outputFormat: "base64url", keyFormat: "text" });
    expect(r.output).toBe("iKqz7ejTrflNJquQ07r9SiCDBww7zOnAFO4EpEOEfAs");
  });
});

