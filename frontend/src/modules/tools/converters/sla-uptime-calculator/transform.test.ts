import { describe, expect, it } from "vitest";
import { formatDuration, parseDowntime, runSlaUptimeCalculator } from "./transform";

describe("formatDuration", () => {
  it("formats seconds", () => {
    expect(formatDuration(86.4)).toBe("1m 26.4s");
    expect(formatDuration(31557.6)).toBe("8h 45m 57.6s");
    expect(formatDuration(0.0864)).toBe("86.4ms");
    expect(formatDuration(3600)).toBe("1h");
  });
});

describe("runSlaUptimeCalculator", () => {
  it("tabulates allowed downtime", () => {
    const out = runSlaUptimeCalculator("99.9\n99.99%", { mode: "table", month: "average" }).output;
    expect(out).toMatch(/99\.9%\s+1m 26\.4s\s+10m 4\.8s\s+43m 49\.8s\s+2h 11m 29\.4s\s+8h 45m 57\.6s/);
    expect(out).toMatch(/99\.99%\s+8\.6s\s+1m 0\.5s\s+4m 23s\s+13m 8\.9s\s+52m 35\.8s/);
  });
  it("uses 30-day months when asked", () => {
    expect(runSlaUptimeCalculator("99.9", { mode: "table", month: "30" }).output).toContain("43m 12s");
  });
  it("combines SLAs in series and in parallel", () => {
    expect(runSlaUptimeCalculator("99.9\n99.95", { mode: "series", month: "average" }).output).toContain("99.9% x 99.95% = 99.85005% (2.82 nines)");
    expect(runSlaUptimeCalculator("99\n99", { mode: "parallel", month: "average" }).output).toContain("= 99.99% (4.00 nines)");
  });
  it("converts downtime back to availability", () => {
    expect(parseDowntime("43m 50s per month", "average")!.seconds).toBe(2630);
    expect(runSlaUptimeCalculator("5 min/day", { mode: "table", month: "average" }).output).toContain("5 min/day -> 99.65277778%");
    expect(runSlaUptimeCalculator("2 days per day", { mode: "table", month: "average" }).error?.message).toContain("more downtime");
    expect(runSlaUptimeCalculator("lots", { mode: "table", month: "average" }).error?.message).toContain("neither a percentage");
  });
});
