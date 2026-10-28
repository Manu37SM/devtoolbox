import { describe, expect, it } from "vitest";
import { contains, matchIps, parseCidr, parseIp } from "./transform";

describe("parsing", () => {
  it("parses IPv4 and IPv6", () => {
    expect(parseIp("10.0.0.1")).toEqual({ v6: false, value: 167772161n });
    expect(parseIp("255.255.255.255").value).toBe(4294967295n);
    expect(parseIp("::1")).toEqual({ v6: true, value: 1n });
    expect(parseIp("2001:db8::1").value).toBe(0x20010db8000000000000000000000001n);
    expect(() => parseIp("256.1.1.1")).toThrow();
    expect(() => parseIp("hello")).toThrow();
  });
  it("normalizes CIDR bases and validates prefix", () => {
    expect(parseCidr("10.1.2.3/8").base).toBe(167772160n);
    expect(parseCidr("192.168.0.1").prefix).toBe(32);
    expect(() => parseCidr("10.0.0.0/33")).toThrow(/too long/);
    expect(() => parseCidr("10.0.0.0/x")).toThrow(/prefix/);
  });
  it("matches containment", () => {
    expect(contains(parseCidr("10.0.0.0/8"), parseIp("10.255.1.1"))).toBe(true);
    expect(contains(parseCidr("10.0.0.0/8"), parseIp("11.0.0.1"))).toBe(false);
    expect(contains(parseCidr("0.0.0.0/0"), parseIp("8.8.8.8"))).toBe(true);
    expect(contains(parseCidr("2001:db8::/32"), parseIp("2001:db8:ffff::1"))).toBe(true);
    expect(contains(parseCidr("0.0.0.0/0"), parseIp("::1"))).toBe(false);
  });
});

describe("matchIps", () => {
  const input = "10.0.0.0/8\n10.1.0.0/16 # office\n2001:db8::/32\n---\n10.1.5.5\n10.9.9.9\n8.8.8.8\n2001:db8::42\nbogus";
  it("picks the most specific range", () => {
    const r = matchIps(input, { showAll: false });
    expect(r.output).toContain("✓ 10.1.5.5  → 10.1.0.0/16");
    expect(r.output).toContain("✓ 10.9.9.9  → 10.0.0.0/8");
    expect(r.output).toContain("✗ 8.8.8.8  (no match)");
    expect(r.output).toContain("✓ 2001:db8::42  → 2001:db8::/32");
    expect(r.output).toContain("4 of 5 matched".replace("4", "3"));
    expect(r.error?.line).toBe(9);
  });
  it("lists every match when asked", () => {
    expect(matchIps(input, { showAll: true }).output).toContain("10.1.0.0/16, 10.0.0.0/8");
  });
  it("requires the separator", () => {
    expect(matchIps("10.0.0.0/8", { showAll: false }).error?.message).toMatch(/---/);
    expect(matchIps("", { showAll: false }).error).toBeNull();
  });
  it("reports a bad CIDR line", () => {
    expect(matchIps("10.0.0.0/99\n---\n1.1.1.1", { showAll: false }).error?.line).toBe(1);
  });
});
