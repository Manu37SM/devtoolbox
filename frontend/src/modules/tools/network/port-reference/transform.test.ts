import { describe, expect, it } from "vitest";
import { PORTS } from "./data";
import { findPorts, lookupPorts } from "./transform";

const any = { protocol: "any" } as const;

describe("data integrity", () => {
  it("has unique, valid ports in ascending order", () => {
    const ports = PORTS.map((p) => p.port);
    expect(new Set(ports).size).toBe(ports.length);
    expect(ports.every((p) => p >= 1 && p <= 65535)).toBe(true);
    expect([...ports].sort((a, b) => a - b)).toEqual(ports);
  });
  it("includes the ports this audience asks about", () => {
    for (const p of [22, 443, 1521, 5432, 6379, 8080, 8443, 9092, 8761, 4200]) expect(findPorts(String(p))).toHaveLength(1);
  });
});

describe("findPorts", () => {
  it("searches by number, range and name", () => {
    expect(findPorts("1521")[0]!.service).toContain("Oracle");
    expect(findPorts("8000-8100").map((p) => p.port)).toEqual(expect.arrayContaining([8000, 8080, 8081]));
    expect(findPorts("kafka")[0]!.port).toBe(9092);
    expect(findPorts("KONG").length).toBeGreaterThanOrEqual(2);
    expect(findPorts("")).toHaveLength(PORTS.length);
  });
});

describe("lookupPorts", () => {
  it("merges several queries without duplicates, sorted by port", () => {
    const out = lookupPorts("kafka\n9092\n22", any).output.split("\n");
    expect(out).toHaveLength(2);
    expect(out[0]).toContain("22");
    expect(out[1]).toContain("Apache Kafka");
  });
  it("filters by protocol", () => {
    const out = lookupPorts("dns", { protocol: "UDP" }).output;
    expect(out).toContain("DNS");
    expect(lookupPorts("123", { protocol: "TCP" }).error).not.toBeNull();
  });
  it("lists everything when empty, and explains misses", () => {
    expect(lookupPorts("", any).output.split("\n").length).toBe(PORTS.length);
    const partial = lookupPorts("443\nzzz", any).output;
    expect(partial).toContain("No match for: zzz.");
    expect(lookupPorts("zzz", any).error?.message).toContain("Try a port");
  });
});
