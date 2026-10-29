import { describe, expect, it } from "vitest";
import { freeBlocks, ipToInt, plan, prefixFor, runVlsmSubnetPlanner } from "./transform";

describe("prefixFor", () => {
  it("adds reserved addresses per platform", () => {
    expect(prefixFor(50, "standard")).toBe(26);
    expect(prefixFor(62, "standard")).toBe(26);
    expect(prefixFor(63, "standard")).toBe(25);
    expect(prefixFor(2, "standard")).toBe(30);
    expect(prefixFor(59, "aws")).toBe(26);
    expect(prefixFor(60, "aws")).toBe(25);
    expect(prefixFor(1, "aws")).toBe(28);
    expect(prefixFor(1, "azure")).toBe(29);
  });
});

describe("plan", () => {
  it("allocates largest first and reports free space", () => {
    const r = plan("192.168.1.0/24", [{ name: "A", hosts: 50, order: 0 }, { name: "B", hosts: 100, order: 1 }, { name: "C", hosts: 2, order: 2 }], { platform: "standard", order: "largest-first" });
    expect(r.allocs.map((a) => `${a.name} ${a.prefix} ${a.start - ipToInt("192.168.1.0")!}`)).toEqual(["B 25 0", "A 26 128", "C 30 192"]);
    expect(r.free).toEqual(["192.168.1.196/30", "192.168.1.200/29", "192.168.1.208/28", "192.168.1.224/27"]);
  });
  it("aligns in input order and reports when space runs out", () => {
    const r = plan("10.0.0.0/24", [{ name: "small", hosts: 2, order: 0 }, { name: "big", hosts: 100, order: 1 }], { platform: "standard", order: "input" });
    expect(r.allocs.map((a) => a.start % 256)).toEqual([0, 128]);
    expect(() => plan("10.0.0.0/25", [{ name: "x", hosts: 100, order: 0 }, { name: "y", hosts: 10, order: 1 }], { platform: "standard", order: "largest-first" })).toThrow(/Not enough space: y/);
  });
  it("normalises a host address to its network", () => {
    expect(plan("10.1.2.99/16", [{ name: "a", hosts: 10, order: 0 }], { platform: "standard", order: "input" }).base).toBe(ipToInt("10.1.0.0"));
  });
  it("covers ranges with minimal CIDR blocks", () => {
    expect(freeBlocks(ipToInt("10.0.0.1")!, ipToInt("10.0.0.6")!)).toEqual(["10.0.0.1/32", "10.0.0.2/31", "10.0.0.4/31", "10.0.0.6/32"]);
    expect(freeBlocks(ipToInt("192.168.0.0")!, ipToInt("192.168.255.255")!)).toEqual(["192.168.0.0/16"]);
    expect(freeBlocks(ipToInt("255.255.255.254")!, ipToInt("255.255.255.255")!)).toEqual(["255.255.255.254/31"]);
  });
});

describe("runVlsmSubnetPlanner", () => {
  it("prints a table with usable ranges for AWS", () => {
    const out = runVlsmSubnetPlanner("10.0.0.0/22\nPublic-a 20\nPrivate-a 200\n# comment\nDB 10", { platform: "aws", order: "largest-first" }).output;
    expect(out).toContain("10.0.0.0/22: 304 of 1024 addresses allocated (30%)");
    expect(out).toMatch(/Private-a\s+200\s+10\.0\.0\.0\/24\s+10\.0\.0\.4 - 10\.0\.0\.254\s+251\s+80%/);
    expect(out).toMatch(/Public-a\s+20\s+10\.0\.1\.0\/27\s+10\.0\.1\.4 - 10\.0\.1\.30\s+27\s+74%/);
    expect(out).toContain("Free: 10.0.1.48/28, 10.0.1.64/26, 10.0.1.128/25, 10.0.2.0/23");
  });
  it("validates input", () => {
    expect(runVlsmSubnetPlanner("10.0.0/24\nA 5", { platform: "standard", order: "input" }).error?.message).toContain("parent network");
    expect(runVlsmSubnetPlanner("10.0.0.0/24\nA lots", { platform: "standard", order: "input" }).error?.message).toContain("<name> <hosts>");
  });
});
