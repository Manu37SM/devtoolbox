import { describe, expect, it } from "vitest";
import { adler32, checksum, crc16, crc32, crc32c, fletcher16 } from "./transform";

const b = (s: string) => new TextEncoder().encode(s);

describe("algorithms (standard check values for '123456789')", () => {
  it("CRC-32", () => expect(crc32(b("123456789"))).toBe(0xcbf43926));
  it("CRC-32C", () => expect(crc32c(b("123456789"))).toBe(0xe3069283));
  it("CRC-16/CCITT-FALSE", () => expect(crc16(b("123456789"))).toBe(0x29b1));
  it("Adler-32 of 'Wikipedia'", () => expect(adler32(b("Wikipedia"))).toBe(0x11e60398));
  it("Fletcher-16 of 'abcde'", () => expect(fletcher16(b("abcde"))).toBe(0xc8f0));
  it("empty input", () => {
    expect(crc32(new Uint8Array())).toBe(0);
    expect(adler32(new Uint8Array())).toBe(1);
  });
});

describe("checksum", () => {
  it("prints a single algorithm with hex and decimal", () => {
    const out = checksum("123456789", { algorithm: "crc32", inputFormat: "text" }).output;
    expect(out).toContain("0xCBF43926  (3421780262)");
    expect(out).toContain("9 bytes");
  });
  it("prints all algorithms", () => {
    expect(checksum("123456789", { algorithm: "all", inputFormat: "text" }).output.match(/0x/g)).toHaveLength(5);
  });
  it("hashes hex input as bytes and UTF-8 text as UTF-8", () => {
    expect(checksum("31 32 33 34 35 36 37 38 39", { algorithm: "crc32", inputFormat: "hex" }).output).toContain("0xCBF43926");
    expect(checksum("é", { algorithm: "crc32", inputFormat: "text" }).output).toContain("2 bytes");
  });
  it("validates hex and handles empty", () => {
    expect(checksum("abc", { algorithm: "crc32", inputFormat: "hex" }).error).not.toBeNull();
    expect(checksum("", { algorithm: "crc32", inputFormat: "text" })).toEqual({ output: "", error: null });
  });
});
