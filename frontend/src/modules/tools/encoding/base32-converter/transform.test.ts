import { describe, expect, it } from "vitest";
import { base32DecodeToBytes, base32EncodeBytes, transformBase32 } from "./transform";

const enc = (s: string) => new TextEncoder().encode(s);
const defaults = { mode: "encode", variant: "rfc4648", padding: true } as const;

describe("RFC 4648 test vectors", () => {
  const vectors: [string, string][] = [
    ["", ""],
    ["f", "MY======"],
    ["fo", "MZXQ===="],
    ["foo", "MZXW6==="],
    ["foob", "MZXW6YQ="],
    ["fooba", "MZXW6YTB"],
    ["foobar", "MZXW6YTBOI======"],
  ];
  it.each(vectors)("encodes %j", (plain, expected) => {
    expect(base32EncodeBytes(enc(plain), "rfc4648", true)).toBe(expected);
  });
  it.each(vectors)("decodes %j", (plain, encoded) => {
    expect(new TextDecoder().decode(base32DecodeToBytes(encoded, "rfc4648"))).toBe(plain);
  });
});

describe("base32hex", () => {
  it("matches the RFC 4648 §10 vectors", () => {
    expect(base32EncodeBytes(enc("foobar"), "base32hex", true)).toBe("CPNMUOJ1E8======");
    expect(base32EncodeBytes(enc("foo"), "base32hex", true)).toBe("CPNMU===");
  });
});

describe("options", () => {
  it("omits padding when disabled", () => {
    expect(transformBase32("f", { ...defaults, padding: false }).output).toBe("MY");
  });

  it("crockford never pads and decodes ambiguous letters leniently", () => {
    const encoded = base32EncodeBytes(enc("foobar"), "crockford", true);
    expect(encoded).not.toContain("=");
    // I/L -> 1, O -> 0, hyphens ignored, case-insensitive
    expect(new TextDecoder().decode(base32DecodeToBytes("cs-qpy", "crockford"))).toBe(
      new TextDecoder().decode(base32DecodeToBytes("CSQPY", "crockford")),
    );
    expect(base32DecodeToBytes("O1IL", "crockford")).toEqual(base32DecodeToBytes("0111", "crockford"));
  });
});

describe("transformBase32", () => {
  it("round-trips unicode text", () => {
    const text = "héllo 🌍";
    const encoded = transformBase32(text, defaults).output;
    expect(transformBase32(encoded, { ...defaults, mode: "decode" }).output).toBe(text);
  });

  it("decodes lowercase and whitespace-wrapped input", () => {
    expect(transformBase32("mzxw6 ytb\noi======", { ...defaults, mode: "decode" }).output).toBe("foobar");
  });

  it("returns an error for invalid characters, bad lengths and non-UTF-8 bytes", () => {
    expect(transformBase32("MZXW1===", { ...defaults, mode: "decode" }).error).not.toBeNull();
    expect(transformBase32("M", { ...defaults, mode: "decode" }).error).not.toBeNull();
    // 0xFF is never valid UTF-8
    const bad = base32EncodeBytes(Uint8Array.from([0xff]), "rfc4648", true);
    expect(transformBase32(bad, { ...defaults, mode: "decode" }).error?.message).toMatch(/UTF-8/);
  });

  it("returns empty output for empty input", () => {
    expect(transformBase32("", defaults)).toEqual({ output: "", error: null });
  });
});
