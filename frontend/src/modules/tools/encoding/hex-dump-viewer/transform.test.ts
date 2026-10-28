import { describe, expect, it } from "vitest";
import { hexDump, parseHexDump, viewHexDump } from "./transform";

const base = { direction: "dump", inputFormat: "text", bytesPerLine: 16, uppercase: false } as const;

describe("hexDump", () => {
  it("matches xxd layout", () => {
    const bytes = new TextEncoder().encode("Hello, World!\n\u0000ÿ");
    const lines = hexDump(bytes, 16, false).split("\n");
    expect(lines[0]).toBe("00000000: 4865 6c6c 6f2c 2057 6f72 6c64 210a 00c3  Hello, World!...");
    expect(lines[1]!.startsWith("00000010: bf")).toBe(true);
    expect(lines[1]!.endsWith("  .")).toBe(true);
    expect(lines[1]!.length).toBe(lines[0]!.length - 15); // ascii column is 15 chars shorter
  });
  it("supports uppercase and different widths", () => {
    expect(hexDump(Uint8Array.from([0xab, 0xcd, 0xef]), 4, true)).toBe("00000000: ABCD EF    ...");
  });
});

describe("viewHexDump", () => {
  it("dumps text and hex input and counts bytes", () => {
    expect(viewHexDump("AB", base).output).toContain("4142");
    expect(viewHexDump("41 42 0x43", { ...base, inputFormat: "hex" }).output).toContain("ABC");
    expect(viewHexDump("41 4", { ...base, inputFormat: "hex" }).error?.message).toContain("even");
  });
  it("round-trips through parse", () => {
    const dump = viewHexDump("The quick brown fox jumps over the lazy dog", base).output.split("\n\n")[0]!;
    expect(new TextDecoder().decode(parseHexDump(dump))).toBe("The quick brown fox jumps over the lazy dog");
    const r = viewHexDump(dump, { ...base, direction: "parse" });
    expect(r.output).toContain("Bytes: 43");
    expect(r.output).toContain('"The quick brown fox jumps over the lazy dog"');
  });
});
