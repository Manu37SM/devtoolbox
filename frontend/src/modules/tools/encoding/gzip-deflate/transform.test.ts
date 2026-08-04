import { describe, expect, it } from "vitest";
import { compressText, bytesToBase64 } from "./transform";
import type { GzipDeflateOptions } from "./schema";

const gzipCompress: GzipDeflateOptions = { format: "gzip", mode: "compress" };
const gzipDecompress: GzipDeflateOptions = { format: "gzip", mode: "decompress" };
const deflateCompress: GzipDeflateOptions = { format: "deflate", mode: "compress" };
const deflateRawCompress: GzipDeflateOptions = { format: "deflate-raw", mode: "compress" };

describe("compressText", () => {
  it("compresses text with gzip and produces base64 output", async () => {
    const result = await compressText("hello world", gzipCompress);
    expect(result.error).toBeNull();
    expect(result.output.length).toBeGreaterThan(0);
    expect(() => atob(result.output)).not.toThrow();
  });

  it("round-trips text through gzip compress/decompress", async () => {
    const compressed = await compressText("The quick brown fox jumps over the lazy dog. ".repeat(20), gzipCompress);
    expect(compressed.error).toBeNull();
    const decompressed = await compressText(compressed.output, gzipDecompress);
    expect(decompressed.error).toBeNull();
    expect(decompressed.output).toBe("The quick brown fox jumps over the lazy dog. ".repeat(20));
  });

  it("round-trips text through deflate compress/decompress", async () => {
    const compressed = await compressText("deflate test data", deflateCompress);
    expect(compressed.error).toBeNull();
    const decompressed = await compressText(compressed.output, { format: "deflate", mode: "decompress" });
    expect(decompressed.error).toBeNull();
    expect(decompressed.output).toBe("deflate test data");
  });

  it("round-trips text through deflate-raw compress/decompress", async () => {
    const compressed = await compressText("raw deflate test", deflateRawCompress);
    expect(compressed.error).toBeNull();
    const decompressed = await compressText(compressed.output, { format: "deflate-raw", mode: "decompress" });
    expect(decompressed.error).toBeNull();
    expect(decompressed.output).toBe("raw deflate test");
  });

  it("round-trips multi-byte Unicode text", async () => {
    const text = "héllo wörld 🚀 日本語";
    const compressed = await compressText(text, gzipCompress);
    expect(compressed.error).toBeNull();
    const decompressed = await compressText(compressed.output, gzipDecompress);
    expect(decompressed.error).toBeNull();
    expect(decompressed.output).toBe(text);
  });

  it("returns empty output for empty input without error", async () => {
    const result = await compressText("   ", gzipCompress);
    expect(result).toEqual({ output: "", error: null });
  });

  it("returns an error when decompressing invalid base64", async () => {
    const result = await compressText("not valid base64!!!", gzipDecompress);
    expect(result.output).toBe("");
    expect(result.error?.message).toBeTruthy();
  });

  it("returns an error when decompressing base64 that isn't valid gzip data", async () => {
    const result = await compressText(btoa("just some random text"), gzipDecompress);
    expect(result.output).toBe("");
    expect(result.error?.message).toBeTruthy();
  });

  it("compresses large repetitive input to a noticeably smaller size", async () => {
    const large = "a".repeat(100_000);
    const result = await compressText(large, gzipCompress);
    expect(result.error).toBeNull();
    const compressedBytes = atob(result.output).length;
    expect(compressedBytes).toBeLessThan(large.length);
  });

  it("bytesToBase64 handles large byte arrays without a stack overflow", () => {
    const bytes = new Uint8Array(50_000).fill(65);
    const output = bytesToBase64(bytes);
    expect(atob(output).length).toBe(50_000);
  });
});
