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

describe("calculateCidrSubnet options", () => {
  it("accepts netmask notation", () => {
    expect(calculateCidrSubnet("10.1.2.3 255.255.0.0")).toMatchObject({ networkAddress: "10.1.0.0", prefixLength: 16 });
    expect(calculateCidrSubnet("10.1.2.3/255.255.255.128")).toMatchObject({ prefixLength: 25 });
    expect(calculateCidrSubnet("10.1.2.3 255.0.255.0").error).toContain("not a contiguous");
  });

  it("applies cloud reserved addresses", () => {
    expect(calculateCidrSubnet("10.0.0.0/24", { platform: "aws" })).toMatchObject({ firstHost: "10.0.0.4", lastHost: "10.0.0.254", usableHosts: 251 });
    expect(calculateCidrSubnet("10.0.0.0/24", { platform: "gcp" })).toMatchObject({ firstHost: "10.0.0.2", lastHost: "10.0.0.253", usableHosts: 252 });
    expect(calculateCidrSubnet("10.0.0.0/29", { platform: "azure" }).usableHosts).toBe(3);
    expect(calculateCidrSubnet("10.0.0.0/31", { platform: "aws" }).usableHosts).toBe(0);
    expect(calculateCidrSubnet("10.0.0.0/24", { platform: "aws" }).platformNote).toContain("AWS");
  });

  it("splits into subnets", () => {
    const r = calculateCidrSubnet("192.168.0.0/24", { splitPrefix: 26 });
    expect(r.subnetCount).toBe(4);
    expect(r.subnets![3]).toEqual({ cidr: "192.168.0.192/26", first: "192.168.0.193", last: "192.168.0.254", usable: 62 });
    expect(calculateCidrSubnet("10.0.0.0/8", { splitPrefix: 24 })).toMatchObject({ subnetCount: 65536 });
    expect(calculateCidrSubnet("10.0.0.0/8", { splitPrefix: 24 }).subnets).toHaveLength(1024);
    expect(calculateCidrSubnet("10.0.0.0/24", { splitPrefix: 16 }).error).toContain("Can't split");
  });

  it("shows binary", () => {
    expect(calculateCidrSubnet("192.168.1.10/24", { showBinary: true }).binary).toEqual({
      address: "11000000.10101000.00000001.00001010",
      mask: "11111111.11111111.11111111.00000000",
      network: "11000000.10101000.00000001.00000000",
    });
  });
});

