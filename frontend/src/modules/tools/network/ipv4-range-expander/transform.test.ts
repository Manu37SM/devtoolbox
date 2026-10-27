import { describe, expect, it } from "vitest";
import { cidrToRange, expandIpv4, rangeToCidrs } from "./transform";
import { parseIpv4 } from "../ipv4-address-converter/transform";

const ip = parseIpv4;
const o = { showUsable: true };

describe("rangeToCidrs", () => {
  it("returns one block for an aligned range", () => {
    expect(rangeToCidrs(ip("10.0.0.0"), ip("10.0.0.255"))).toEqual(["10.0.0.0/24"]);
    expect(rangeToCidrs(ip("0.0.0.0"), ip("255.255.255.255"))).toEqual(["0.0.0.0/0"]);
    expect(rangeToCidrs(ip("1.2.3.4"), ip("1.2.3.4"))).toEqual(["1.2.3.4/32"]);
  });
  it("splits unaligned ranges minimally", () => {
    expect(rangeToCidrs(ip("192.168.0.1"), ip("192.168.0.10"))).toEqual(["192.168.0.1/32", "192.168.0.2/31", "192.168.0.4/30", "192.168.0.8/31", "192.168.0.10/32"]);
    expect(rangeToCidrs(ip("10.0.0.0"), ip("10.0.1.127"))).toEqual(["10.0.0.0/24", "10.0.1.0/25"]);
  });
  it("covers exactly the requested addresses", () => {
    const start = ip("172.16.5.17");
    const end = ip("172.16.9.200");
    let covered = 0;
    let next = start;
    for (const c of rangeToCidrs(start, end)) {
      const r = cidrToRange(c);
      expect(r.first).toBe(next);
      covered += r.count;
      next = r.last + 1;
    }
    expect(covered).toBe(end - start + 1);
  });
});

describe("cidrToRange", () => {
  it("normalises the host bits", () => {
    expect(cidrToRange("192.168.1.77/24")).toMatchObject({ first: ip("192.168.1.0"), last: ip("192.168.1.255"), count: 256 });
    expect(cidrToRange("10.0.0.0/8").count).toBe(16_777_216);
    expect(cidrToRange("0.0.0.0/0").count).toBe(2 ** 32);
  });
  it("rejects bad blocks", () => {
    expect(() => cidrToRange("10.0.0.0/33")).toThrow();
    expect(() => cidrToRange("10.0.0.0")).toThrow();
  });
});

describe("expandIpv4", () => {
  it("accepts several range separators", () => {
    for (const s of ["10.0.0.0 - 10.0.0.255", "10.0.0.0-10.0.0.255", "10.0.0.0 to 10.0.0.255", "10.0.0.0, 10.0.0.255", "10.0.0.0 10.0.0.255"]) {
      expect(expandIpv4(s, o).output).toContain("  10.0.0.0/24");
    }
  });
  it("describes CIDR blocks with usable-host counts", () => {
    expect(expandIpv4("192.168.1.0/24", o).output).toBe("192.168.1.0/24\n  192.168.1.0 – 192.168.1.255\n  256 addresses, 254 usable hosts");
    expect(expandIpv4("10.0.0.0/31", o).output).toContain("2 usable hosts");
    expect(expandIpv4("10.0.0.0/24", { showUsable: false }).output).not.toContain("usable");
  });
  it("reports reversed ranges, malformed lines and empty input", () => {
    expect(expandIpv4("10.0.0.9 - 10.0.0.1", o).error?.message).toMatch(/after the end/);
    expect(expandIpv4("10.0.0.1", o).error).not.toBeNull();
    expect(expandIpv4("", o)).toEqual({ output: "", error: null });
  });
});
