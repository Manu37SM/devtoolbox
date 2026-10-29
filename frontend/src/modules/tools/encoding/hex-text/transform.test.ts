import { describe, expect, it } from "vitest";
import { transformHexText } from "./transform";
import type { HexTextOptions } from "./schema";

const textToHexSpace: HexTextOptions = { mode: "text-to-hex", hexSeparator: "space", hexUppercase: false, hexPrefix: "none" as const };
const textToHexNone: HexTextOptions = { mode: "text-to-hex", hexSeparator: "none", hexUppercase: false, hexPrefix: "none" as const };
const hexToText: HexTextOptions = { mode: "hex-to-text", hexSeparator: "space", hexUppercase: false, hexPrefix: "none" as const };
const textToBinary: HexTextOptions = { mode: "text-to-binary", hexSeparator: "space", hexUppercase: false, hexPrefix: "none" as const };
const binaryToText: HexTextOptions = { mode: "binary-to-text", hexSeparator: "space", hexUppercase: false, hexPrefix: "none" as const };

describe("transformHexText", () => {
  it("converts text to hex with a space separator", () => {
    const result = transformHexText("Hi", textToHexSpace);
    expect(result.error).toBeNull();
    expect(result.output).toBe("48 69");
  });

  it("converts text to hex with no separator", () => {
    const result = transformHexText("Hi", textToHexNone);
    expect(result.error).toBeNull();
    expect(result.output).toBe("4869");
  });

  it("converts hex back to text", () => {
    const result = transformHexText("48 69", hexToText);
    expect(result.error).toBeNull();
    expect(result.output).toBe("Hi");
  });

  it("converts hex with no separator back to text", () => {
    const result = transformHexText("4869", hexToText);
    expect(result.error).toBeNull();
    expect(result.output).toBe("Hi");
  });

  it("round-trips multi-byte Unicode characters through hex", () => {
    const encoded = transformHexText("héllo 🚀", textToHexSpace);
    expect(encoded.error).toBeNull();
    const decoded = transformHexText(encoded.output, hexToText);
    expect(decoded.error).toBeNull();
    expect(decoded.output).toBe("héllo 🚀");
  });

  it("errors on odd-length hex input", () => {
    const result = transformHexText("486", hexToText);
    expect(result.output).toBe("");
    expect(result.error?.message).toBeTruthy();
  });

  it("errors on non-hex characters", () => {
    const result = transformHexText("zz", hexToText);
    expect(result.output).toBe("");
    expect(result.error?.message).toBeTruthy();
  });

  it("converts text to 8-bit binary", () => {
    const result = transformHexText("A", textToBinary);
    expect(result.error).toBeNull();
    expect(result.output).toBe("01000001");
  });

  it("converts binary back to text", () => {
    const result = transformHexText("01000001", binaryToText);
    expect(result.error).toBeNull();
    expect(result.output).toBe("A");
  });

  it("round-trips multi-byte Unicode through binary", () => {
    const encoded = transformHexText("café", textToBinary);
    expect(encoded.error).toBeNull();
    const decoded = transformHexText(encoded.output, binaryToText);
    expect(decoded.error).toBeNull();
    expect(decoded.output).toBe("café");
  });

  it("errors on binary input not a multiple of 8 bits", () => {
    const result = transformHexText("0100000", binaryToText);
    expect(result.output).toBe("");
    expect(result.error?.message).toBeTruthy();
  });

  it("returns empty output for empty input without error", () => {
    const result = transformHexText("", textToHexSpace);
    expect(result).toEqual({ output: "", error: null });
  });

  const hex = { mode: "text-to-hex" as const, hexSeparator: "space" as const, hexUppercase: false, hexPrefix: "none" as const };

  it("formats bytes as C, Python, URL or MAC-style hex", () => {
    expect(transformHexText("AB", { ...hex, hexSeparator: "comma", hexPrefix: "0x", hexUppercase: true }).output).toBe("0x41, 0x42");
    expect(transformHexText("AB", { ...hex, hexSeparator: "none", hexPrefix: "\\x" }).output).toBe("\\x41\\x42");
    expect(transformHexText("₹", { ...hex, hexSeparator: "none", hexPrefix: "%", hexUppercase: true }).output).toBe("%E2%82%B9");
    expect(transformHexText("AB", { ...hex, hexSeparator: "colon" }).output).toBe("41:42");
  });

  it("reads hex written with any of those prefixes back", () => {
    for (const src of ["0x41, 0x42", "\\x41\\x42", "%41%42", "41:42"]) {
      expect(transformHexText(src, { ...hex, mode: "hex-to-text" }).output).toBe("AB");
    }
  });
});

