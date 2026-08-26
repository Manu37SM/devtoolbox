import { describe, expect, it } from "vitest";
import { convertPunycode, domainFromPunycode, domainToPunycode } from "./transform";

describe("domainToPunycode", () => {
  it("encodes a German umlaut domain", () => {
    expect(domainToPunycode("bücher.de")).toEqual({ output: "xn--bcher-kva.de", error: null });
    expect(domainToPunycode("müller.de")).toEqual({ output: "xn--mller-kva.de", error: null });
  });

  it("encodes a fully non-ASCII (Japanese) label", () => {
    const result = domainToPunycode("日本語.jp");
    expect(result.error).toBeNull();
    expect(result.output).toBe("xn--wgv71a119e.jp");
  });

  it("leaves an already-ASCII domain unchanged", () => {
    expect(domainToPunycode("example.com")).toEqual({ output: "example.com", error: null });
  });

  it("only prefixes the non-ASCII label in a mixed multi-label domain", () => {
    const result = domainToPunycode("shop.müller.de");
    expect(result.output).toBe("shop.xn--mller-kva.de");
  });

  it("returns empty output for empty input", () => {
    expect(domainToPunycode("")).toEqual({ output: "", error: null });
  });
});

describe("domainFromPunycode", () => {
  it("decodes an xn-- label back to Unicode", () => {
    expect(domainFromPunycode("xn--mller-kva.de")).toEqual({ output: "müller.de", error: null });
  });

  it("decodes a fully non-ASCII (Japanese) label", () => {
    expect(domainFromPunycode("xn--wgv71a119e.jp")).toEqual({ output: "日本語.jp", error: null });
  });

  it("leaves labels without an xn-- prefix unchanged", () => {
    expect(domainFromPunycode("example.com")).toEqual({ output: "example.com", error: null });
  });

  it("round-trips through encode/decode", () => {
    const encoded = domainToPunycode("café.fr");
    expect(domainFromPunycode(encoded.output).output).toBe("café.fr");
  });

  it("errors on malformed punycode", () => {
    const result = domainFromPunycode("xn--@@@");
    expect(result.error).not.toBeNull();
  });
});

describe("convertPunycode", () => {
  it("dispatches to encode/decode based on mode", () => {
    expect(convertPunycode("müller.de", "encode").output).toBe("xn--mller-kva.de");
    expect(convertPunycode("xn--mller-kva.de", "decode").output).toBe("müller.de");
  });
});
