import { describe, expect, it } from "vitest";
import { transformHexText } from "./transform";
import type { HexTextOptions } from "./schema";

const textToHexSpace: HexTextOptions = { mode: "text-to-hex", hexSeparator: "space" };
const textToHexNone: HexTextOptions = { mode: "text-to-hex", hexSeparator: "none" };
const hexToText: HexTextOptions = { mode: "hex-to-text", hexSeparator: "space" };
const textToBinary: HexTextOptions = { mode: "text-to-binary", hexSeparator: "space" };
const binaryToText: HexTextOptions = { mode: "binary-to-text", hexSeparator: "space" };

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
});
