import { describe, expect, it } from "vitest";
import { ALPHABETS, convertBase58 } from "./transform";

const o = { direction: "encode", alphabet: "base58", binaryFormat: "text" } as const;

describe("alphabets", () => {
  it("have the right sizes and are duplicate-free", () => {
    for (const [k, v] of Object.entries(ALPHABETS)) {
      expect(new Set(v).size).toBe(v.length);
      expect(v.length).toBe(k === "base62" ? 62 : 58);
    }
  });
});

describe("convertBase58", () => {
  it("matches known Bitcoin Base58 vectors", () => {
    expect(convertBase58("Hello World!", o).output).toBe("2NEpo7TZRRrLZSi2U");
    expect(convertBase58("The quick brown fox jumps over the lazy dog.", o).output).toBe("USm3fpXnKG5EUBx2ndxBDMPVciP5hGey2Jh4NDv6gmeo1LkMeiKrLJUUBk6Z");
    expect(convertBase58("00000000", { ...o, binaryFormat: "hex" }).output).toBe("1111");
    expect(convertBase58("0000287fb4cd", { ...o, binaryFormat: "hex" }).output).toBe("11233QC4");
  });
  it("round-trips text and hex with leading zero bytes", () => {
    const enc = convertBase58("00 00 ff 10", { ...o, binaryFormat: "hex" }).output;
    expect(convertBase58(enc, { ...o, direction: "decode", binaryFormat: "hex" }).output).toBe("0000ff10");
    const t = convertBase58("héllo ✓", o).output;
    expect(convertBase58(t, { ...o, direction: "decode" }).output).toBe("héllo ✓");
  });
  it("supports base62 and rejects foreign characters", () => {
    const enc = convertBase58("ff", { ...o, alphabet: "base62", binaryFormat: "hex" }).output;
    expect(enc).toBe("47"); // 255 = 4*62 + 7
    expect(convertBase58("0OIl", { ...o, direction: "decode" }).error?.message).toContain('"0"');
  });
  it("explains invalid UTF-8 and bad hex", () => {
    expect(convertBase58("2", { ...o, direction: "decode", alphabet: "base58" }).error).toBeNull();
    const bad = convertBase58("5Q", { ...o, direction: "decode" }); // 0xff
    expect(bad.error?.message).toContain("hex");
    expect(convertBase58("abc", { ...o, binaryFormat: "hex" }).error?.message).toContain("even");
  });
});
