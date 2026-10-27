import { describe, expect, it } from "vitest";
import { describeMac, formatMac, macAddressTool, parseMac, randomMac } from "./transform";

const base = { mode: "convert", style: "colon", upper: true, details: false, count: 5, localAdmin: true } as const;

describe("parse/format", () => {
  it("parses every common notation", () => {
    for (const s of ["00:1A:2B:3C:4D:5E", "00-1a-2b-3c-4d-5e", "001a.2b3c.4d5e", "001A2B3C4D5E", " 00 1a 2b 3c 4d 5e "]) {
      expect(Array.from(parseMac(s))).toEqual([0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e]);
    }
  });
  it("formats in each style and case", () => {
    const b = parseMac("001a2b3c4d5e");
    expect(formatMac(b, "colon", true)).toBe("00:1A:2B:3C:4D:5E");
    expect(formatMac(b, "hyphen", false)).toBe("00-1a-2b-3c-4d-5e");
    expect(formatMac(b, "cisco", false)).toBe("001a.2b3c.4d5e");
    expect(formatMac(b, "plain", true)).toBe("001A2B3C4D5E");
  });
  it.each(["00:1A:2B:3C:4D", "zz:1A:2B:3C:4D:5E", "", "00:1A:2B:3C:4D:5E:6F"])("rejects %j", (s) => {
    expect(() => parseMac(s)).toThrow();
  });
});

describe("describeMac", () => {
  it("reads the multicast and local bits and the OUI", () => {
    expect(describeMac(parseMac("00:1a:2b:3c:4d:5e"))).toBe("unicast, universally administered, OUI 00-1A-2B");
    expect(describeMac(parseMac("01:00:5e:00:00:01"))).toContain("multicast");
    expect(describeMac(parseMac("02:00:00:00:00:00"))).toContain("locally administered");
  });
});

describe("randomMac", () => {
  it("always yields a unicast address with the requested admin bit", () => {
    const rand = (n: number) => new Uint8Array(n).fill(0xff);
    expect(randomMac(true, rand)[0]! & 0b11).toBe(0b10);
    expect(randomMac(false, rand)[0]! & 0b11).toBe(0);
    for (let i = 0; i < 50; i++) expect(randomMac(true)[0]! & 1).toBe(0);
  });
});

describe("macAddressTool", () => {
  it("converts several addresses and optionally explains them", () => {
    expect(macAddressTool("001a.2b3c.4d5e, 00-00-00-00-00-01", base).output).toBe("00:1A:2B:3C:4D:5E\n00:00:00:00:00:01");
    expect(macAddressTool("02:00:00:00:00:00", { ...base, details: true }).output).toContain("locally administered");
  });
  it("generates the requested number of valid addresses", () => {
    const lines = macAddressTool("", { ...base, mode: "generate", count: 7, upper: false, style: "hyphen" }).output.split("\n");
    expect(lines).toHaveLength(7);
    for (const l of lines) expect(l).toMatch(/^([0-9a-f]{2}-){5}[0-9a-f]{2}$/);
  });
  it("clamps absurd counts", () => {
    expect(macAddressTool("", { ...base, mode: "generate", count: 100000 }).output.split("\n")).toHaveLength(500);
  });
  it("reports errors and empty input", () => {
    expect(macAddressTool("nope", base).error).not.toBeNull();
    expect(macAddressTool("", base)).toEqual({ output: "", error: null });
  });
});
