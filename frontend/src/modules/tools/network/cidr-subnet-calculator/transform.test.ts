import { describe, expect, it } from "vitest";
import { calculateCidrSubnet } from "./transform";

describe("calculateCidrSubnet", () => {
  it("computes a standard /24 subnet", () => {
    const result = calculateCidrSubnet("192.168.1.0/24");
    expect(result.error).toBeNull();
    expect(result.networkAddress).toBe("192.168.1.0");
    expect(result.broadcastAddress).toBe("192.168.1.255");
    expect(result.subnetMask).toBe("255.255.255.0");
    expect(result.wildcardMask).toBe("0.0.0.255");
    expect(result.firstHost).toBe("192.168.1.1");
    expect(result.lastHost).toBe("192.168.1.254");
    expect(result.totalHosts).toBe(256);
    expect(result.usableHosts).toBe(254);
  });

  it("computes a /16 subnet", () => {
    const result = calculateCidrSubnet("10.0.0.0/16");
    expect(result.networkAddress).toBe("10.0.0.0");
    expect(result.broadcastAddress).toBe("10.0.255.255");
    expect(result.subnetMask).toBe("255.255.0.0");
    expect(result.totalHosts).toBe(65536);
    expect(result.usableHosts).toBe(65534);
  });

  it("normalizes a host address to its network address", () => {
    const result = calculateCidrSubnet("192.168.1.130/24");
    expect(result.networkAddress).toBe("192.168.1.0");
    expect(result.broadcastAddress).toBe("192.168.1.255");
  });

  it("handles a /32 host route with a single usable address", () => {
    const result = calculateCidrSubnet("192.168.1.5/32");
    expect(result.networkAddress).toBe("192.168.1.5");
    expect(result.broadcastAddress).toBe("192.168.1.5");
    expect(result.firstHost).toBe("192.168.1.5");
    expect(result.lastHost).toBe("192.168.1.5");
    expect(result.usableHosts).toBe(1);
    expect(result.totalHosts).toBe(1);
  });

  it("handles a /31 point-to-point link per RFC 3021", () => {
    const result = calculateCidrSubnet("192.168.1.0/31");
    expect(result.networkAddress).toBe("192.168.1.0");
    expect(result.broadcastAddress).toBe("192.168.1.1");
    expect(result.firstHost).toBe("192.168.1.0");
    expect(result.lastHost).toBe("192.168.1.1");
    expect(result.usableHosts).toBe(2);
  });

  it("handles /0 covering the entire address space", () => {
    const result = calculateCidrSubnet("0.0.0.0/0");
    expect(result.networkAddress).toBe("0.0.0.0");
    expect(result.broadcastAddress).toBe("255.255.255.255");
    expect(result.subnetMask).toBe("0.0.0.0");
    expect(result.totalHosts).toBe(4294967296);
  });

  it("errors on an out-of-range octet", () => {
    const result = calculateCidrSubnet("192.168.1.256/24");
    expect(result.error).not.toBeNull();
  });

  it("errors on an out-of-range prefix length", () => {
    const result = calculateCidrSubnet("192.168.1.0/33");
    expect(result.error).not.toBeNull();
  });

  it("errors on malformed input missing a prefix", () => {
    const result = calculateCidrSubnet("192.168.1.0");
    expect(result.error).not.toBeNull();
  });

  it("errors on empty input", () => {
    const result = calculateCidrSubnet("");
    expect(result.error).not.toBeNull();
  });

  it("errors on non-numeric octets", () => {
    const result = calculateCidrSubnet("abc.def.ghi.jkl/24");
    expect(result.error).not.toBeNull();
  });

  it("computes a /28 subnet with a small host range", () => {
    const result = calculateCidrSubnet("172.16.5.16/28");
    expect(result.networkAddress).toBe("172.16.5.16");
    expect(result.broadcastAddress).toBe("172.16.5.31");
    expect(result.firstHost).toBe("172.16.5.17");
    expect(result.lastHost).toBe("172.16.5.30");
    expect(result.totalHosts).toBe(16);
    expect(result.usableHosts).toBe(14);
  });
});
