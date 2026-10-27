import { describe, expect, it } from "vitest";
import { COMMON_PORTS, generatePorts, portRange, randomInt } from "./transform";

const base = { range: "registered", min: 1024, max: 65535, count: 5, avoidCommon: true, sorted: true } as const;

describe("portRange", () => {
  it("maps each preset", () => {
    expect(portRange({ ...base, range: "registered" })).toEqual([1024, 49151]);
    expect(portRange({ ...base, range: "dynamic" })).toEqual([49152, 65535]);
    expect(portRange({ ...base, range: "any" })).toEqual([1024, 65535]);
    expect(portRange({ ...base, range: "custom", min: 2000, max: 3000 })).toEqual([2000, 3000]);
  });
});

describe("randomInt", () => {
  it("covers both ends of the range", () => {
    expect(randomInt(5, 9, () => 0)).toBe(5);
    expect(randomInt(5, 9, () => 0.999999)).toBe(9);
  });
});

describe("generatePorts", () => {
  it("returns the requested number of unique, sorted ports inside the range", () => {
    const ports = generatePorts("", { ...base, count: 20 }).output.split("\n").map(Number);
    expect(ports).toHaveLength(20);
    expect(new Set(ports).size).toBe(20);
    expect([...ports].sort((a, b) => a - b)).toEqual(ports);
    expect(ports.every((p) => p >= 1024 && p <= 49151)).toBe(true);
  });

  it("never returns a commonly used port when avoiding them", () => {
    // Narrow range around well-known dev ports so a naive implementation would hit them.
    const r = generatePorts("", { ...base, range: "custom", min: 8078, max: 8090, count: 10 });
    const ports = r.output.split("\n").map(Number);
    expect(ports.some((p) => COMMON_PORTS.has(p))).toBe(false);
  });

  it("is deterministic with an injected random source", () => {
    let i = 0;
    const seq = [0, 0.5, 0, 0.25];
    const r = generatePorts("", { ...base, range: "custom", min: 10000, max: 10099, count: 3, avoidCommon: false, sorted: false }, 0, () => seq[i++ % seq.length]!);
    expect(r.output).toBe("10000\n10050\n10025");
  });

  it("errors when the range cannot supply enough ports or is invalid", () => {
    expect(generatePorts("", { ...base, range: "custom", min: 8080, max: 8082, count: 5, avoidCommon: false }).error?.message).toMatch(/Only 3/);
    expect(generatePorts("", { ...base, range: "custom", min: 100, max: 50 }).error).not.toBeNull();
    expect(generatePorts("", { ...base, range: "custom", min: 0, max: 50 }).error).not.toBeNull();
    expect(generatePorts("", { ...base, range: "custom", min: 1, max: 70000 }).error).not.toBeNull();
  });
});
