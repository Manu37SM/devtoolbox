import { describe, expect, it } from "vitest";
import { convertKubernetesResources, formatBinary, formatCores, parseCpu, parseMemory } from "./transform";

describe("parsers", () => {
  it("parse CPU", () => {
    expect(parseCpu("500m")).toBe(0.5);
    expect(parseCpu("2")).toBe(2);
    expect(parseCpu("0.1")).toBe(0.1);
    expect(parseCpu("1x")).toBeNull();
  });
  it("parse memory with binary, decimal and exponent forms", () => {
    expect(parseMemory("128Mi")).toBe(128 * 1024 * 1024);
    expect(parseMemory("1G")).toBe(1e9);
    expect(parseMemory("1.5Gi")).toBe(1.5 * 1024 ** 3);
    expect(parseMemory("129e6")).toBe(129e6);
    expect(parseMemory("12Xi")).toBeNull();
  });
  it("format back to the largest exact unit", () => {
    expect(formatBinary(2 * 1024 ** 3)).toBe("2Gi");
    expect(formatBinary(1536 * 1024 * 1024)).toBe("1536Mi");
    expect(formatBinary(1000)).toBe("1000");
    expect(formatCores(0.25)).toBe("250m");
    expect(formatCores(2)).toBe("2");
  });
});

describe("convertKubernetesResources", () => {
  it("handles auto-detect and key hints", () => {
    const r = convertKubernetesResources("cpu: 250m\nmemory: 512Mi\ncpu: 2\nmemory: 1000000000", { kind: "auto" });
    expect(r.error).toBeNull();
    expect(r.output).toContain("CPU: 250m = 0.25 cores = 250 millicores");
    expect(r.output).toContain("Memory: 512Mi = 536870912 bytes = 512 MiB");
    expect(r.output).toContain("CPU: 2 = 2 cores = 2000 millicores");
    expect(r.output).toContain("1000000000 bytes = 953.674 MiB");
  });
  it("flags invalid quantities, including m on memory", () => {
    const r = convertKubernetesResources("memory: 10m\n3Zi", { kind: "auto" });
    expect(r.error?.message).toContain("memory: 10m");
    expect(r.output).toContain("Not a valid quantity");
  });
});
