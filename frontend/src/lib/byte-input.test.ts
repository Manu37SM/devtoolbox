import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64, bytesToHex, hexToBytes, parseByteInput } from "@/lib/byte-input";

describe("byte-input", () => {
  it("parses hex with separators and base64url", () => {
    expect(bytesToHex(hexToBytes("de:ad be-ef"))).toBe("DEADBEEF");
    expect(bytesToHex(base64ToBytes("_-8"))).toBe("FFEF");
    expect(bytesToBase64(Uint8Array.from([1, 2, 3]))).toBe("AQID");
  });
  it("auto-detects hex, base64 and PEM", () => {
    expect(bytesToHex(parseByteInput("0x0a0b"))).toBe("0A0B");
    expect(bytesToHex(parseByteInput("AQID"))).toBe("010203");
    expect(bytesToHex(parseByteInput("-----BEGIN X-----\nAQID\n-----END X-----"))).toBe("010203");
  });
  it("rejects bad input", () => {
    expect(() => hexToBytes("abc")).toThrow("odd");
    expect(() => base64ToBytes("a$")).toThrow("invalid characters");
  });
});
