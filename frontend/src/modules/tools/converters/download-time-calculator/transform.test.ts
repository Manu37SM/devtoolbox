import { describe, expect, it } from "vitest";
import { calcDownloadTime, formatDuration, parseSize } from "./transform";

const o = { speed: 100, speedUnit: "Mbps", efficiency: 100 } as const;

describe("parseSize", () => {
  it("distinguishes decimal and binary units, in bytes", () => {
    expect(parseSize("1 GB")).toBe(1e9);
    expect(parseSize("1 GiB")).toBe(1024 ** 3);
    expect(parseSize("1,500 MB")).toBe(1.5e9);
    expect(parseSize("2.5kb")).toBe(2500);
    expect(parseSize("12 parsecs")).toBeNull();
    expect(parseSize("GB")).toBeNull();
    expect(parseSize("1 toString")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats across scales", () => {
    expect(formatDuration(0.25)).toBe("250 ms");
    expect(formatDuration(59)).toBe("59s");
    expect(formatDuration(3661)).toBe("1h 1m 1s");
    expect(formatDuration(90_000)).toBe("1d 1h");
  });
});

describe("calcDownloadTime", () => {
  it("1 GB over 100 Mbps takes 80 seconds (bytes vs bits)", () => {
    expect(calcDownloadTime("1 GB", o).output.split("\n")[0]).toBe("1 GB  →  1m 20s");
  });
  it("applies link efficiency", () => {
    expect(calcDownloadTime("1 GB", { ...o, efficiency: 80 }).output.split("\n")[0]).toBe("1 GB  →  1m 40s");
  });
  it("treats MBps as megaBYTES per second", () => {
    expect(calcDownloadTime("1 GB", { ...o, speed: 100, speedUnit: "MBps" }).output.split("\n")[0]).toBe("1 GB  →  10s");
  });
  it("handles Gbps and multiple lines", () => {
    const out = calcDownloadTime("125 MB\n1 TB", { ...o, speed: 1, speedUnit: "Gbps" }).output;
    expect(out).toContain("125 MB  →  1s");
    expect(out).toContain("1 TB  →  2h 13m 20s");
  });
  it("reports the effective throughput", () => {
    expect(calcDownloadTime("1 MB", o).output).toContain("≈ 12.50 MB/s");
  });
  it("validates", () => {
    expect(calcDownloadTime("abc", o).error?.line).toBe(1);
    expect(calcDownloadTime("1 GB", { ...o, speed: 0 }).error).not.toBeNull();
    expect(calcDownloadTime("", o)).toEqual({ output: "", error: null });
  });
});
