import { describe, expect, it } from "vitest";
import { convertIpv4Address, describeIpv4, parseIpv4, toDotted } from "./transform";

describe("parseIpv4", () => {
  it("parses every supported notation to the same number", () => {
    const n = 3232235521; // 192.168.0.1
    for (const s of ["192.168.0.1", "3232235521", "0xC0A80001", "0xc0a80001", "11000000.10101000.00000000.00000001", "0b11000000101010000000000000000001", "11000000101010000000000000000001"]) {
      expect(parseIpv4(s)).toBe(n);
    }
  });
  it("handles the extremes", () => {
    expect(parseIpv4("0.0.0.0")).toBe(0);
    expect(parseIpv4("255.255.255.255")).toBe(4294967295);
    expect(toDotted(4294967295)).toBe("255.255.255.255");
    expect(toDotted(16909060)).toBe("1.2.3.4");
  });
  it.each(["256.1.1.1", "1.2.3", "4294967296", "0x1FFFFFFFF", "hello", "1.2.3.4.5"])("rejects %s", (s) => {
    expect(() => parseIpv4(s)).toThrow();
  });
});

describe("describeIpv4", () => {
  it("lists all representations", () => {
    const d = describeIpv4(parseIpv4("192.168.0.1"));
    expect(d).toContain("Integer          3232235521");
    expect(d).toContain("0xC0A80001");
    expect(d).toContain("11000000.10101000.00000000.00000001");
    expect(d).toContain("0300.0250.0000.0001");
    expect(d).toContain("::ffff:c0a8:0001");
    expect(d).toContain("1.0.168.192.in-addr.arpa");
    expect(d).toContain("private (192.168.0.0/16)");
    expect(d).toContain("legacy class C");
  });
  it.each([
    ["8.8.8.8", "public"], ["10.1.2.3", "private (10.0.0.0/8)"], ["172.16.0.1", "private (172.16.0.0/12)"], ["172.32.0.1", "public"],
    ["127.0.0.1", "loopback"], ["169.254.1.1", "link-local"], ["100.64.0.1", "carrier-grade NAT"], ["192.0.2.5", "documentation"],
    ["224.0.0.1", "multicast"], ["240.0.0.1", "reserved"], ["255.255.255.255", "limited broadcast"], ["0.1.2.3", "this network"],
  ])("classifies %s", (ip, label) => {
    expect(describeIpv4(parseIpv4(ip))).toContain(label);
  });
});

describe("convertIpv4Address", () => {
  it("handles several addresses and blank lines", () => {
    const out = convertIpv4Address("1.1.1.1\n\n8.8.8.8", {}).output;
    expect(out.split("\n\n")).toHaveLength(2);
  });
  it("reports errors and empty input", () => {
    expect(convertIpv4Address("nope", {}).error).not.toBeNull();
    expect(convertIpv4Address(" ", {})).toEqual({ output: "", error: null });
  });
});
