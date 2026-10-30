import { describe, expect, it } from "vitest";
import { parseCron } from "./transform";

describe("parseCron", () => {
  it("parses '* * * * *' as every minute", () => {
    const result = parseCron("* * * * *", 3, new Date("2026-01-01T00:00:00Z"));
    expect(result.valid).toBe(true);
    expect(result.description).toBe("Every minute");
    expect(result.nextRuns).toEqual([
      "2026-01-01T00:01:00.000Z",
      "2026-01-01T00:02:00.000Z",
      "2026-01-01T00:03:00.000Z",
    ]);
  });

  it("parses a specific time '30 9 * * *'", () => {
    const result = parseCron("30 9 * * *", 1, new Date("2026-01-01T00:00:00Z"));
    expect(result.valid).toBe(true);
    expect(result.description).toBe("At 09:30");
    expect(result.nextRuns).toEqual(["2026-01-01T09:30:00.000Z"]);
  });

  it("supports comma lists", () => {
    const result = parseCron("0 0,12 * * *", 2, new Date("2026-01-01T00:00:00Z"));
    expect(result.valid).toBe(true);
    expect(result.nextRuns).toEqual([
      "2026-01-01T12:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
    ]);
  });

  it("supports step values (*/15)", () => {
    const result = parseCron("*/15 * * * *", 4, new Date("2026-01-01T00:00:00Z"));
    expect(result.nextRuns).toEqual([
      "2026-01-01T00:15:00.000Z",
      "2026-01-01T00:30:00.000Z",
      "2026-01-01T00:45:00.000Z",
      "2026-01-01T01:00:00.000Z",
    ]);
  });

  it("supports ranges (9-17)", () => {
    const result = parseCron("0 9-17 * * *", 1, new Date("2026-01-01T10:30:00Z"));
    expect(result.nextRuns).toEqual(["2026-01-01T11:00:00.000Z"]);
  });

  it("returns empty result for empty input without error", () => {
    expect(parseCron("", 5)).toEqual({ valid: false, error: null, description: null, nextRuns: [], nextRunsLocal: [] });
  });

  it("errors when the field count is wrong", () => {
    const result = parseCron("* * * *", 5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Expected 5 fields");
  });

  it("errors on an out-of-range value", () => {
    const result = parseCron("99 * * * *", 5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("minute");
  });

  it("errors on malformed syntax", () => {
    const result = parseCron("a b c d e", 5);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  const from = new Date("2026-10-29T10:00:00Z");
  const days = (expr: string, o: Parameters<typeof parseCron>[1]) => parseCron(expr, o, from).nextRunsLocal.map((r) => r.slice(0, 14));

  it("fires when either day field matches in crontab, as Vixie cron does", () => {
    expect(days("0 0 1 * MON", { nextRunCount: 3 })).toEqual(["Sun 2026-11-01", "Mon 2026-11-02", "Mon 2026-11-09"]);
  });

  it("reads month and weekday names, 7 as Sunday, macros and n/step", () => {
    expect(days("0 0 * JAN SUN", { nextRunCount: 1 })).toEqual(["Sun 2027-01-03"]);
    expect(days("0 0 * * 7", { nextRunCount: 1 })).toEqual(["Sun 2026-11-01"]);
    expect(parseCron("@hourly", { nextRunCount: 1 }, from).nextRuns).toEqual(["2026-10-29T11:00:00.000Z"]);
    expect(parseCron("0 0/30 8-10 * * *", { dialect: "spring", nextRunCount: 2 }, from).nextRuns).toEqual(["2026-10-29T10:30:00.000Z", "2026-10-30T08:00:00.000Z"]);
  });

  it("supports Spring's seconds field, L, L-n, nW, LW, dL and d#n (examples from the Spring reference)", () => {
    const spring = { dialect: "spring" as const, nextRunCount: 2 };
    expect(parseCron("*/10 * * * * *", spring, from).nextRuns).toEqual(["2026-10-29T10:00:10.000Z", "2026-10-29T10:00:20.000Z"]);
    expect(days("0 0 0 L * *", spring)).toEqual(["Sat 2026-10-31", "Mon 2026-11-30"]);
    // 31 Oct - 3 is the 28th, already past on the 29th, so November is next.
    expect(days("0 0 0 L-3 * *", spring)).toEqual(["Fri 2026-11-27", "Mon 2026-12-28"]);
    expect(days("0 0 0 * * 5L", spring)).toEqual(["Fri 2026-10-30", "Fri 2026-11-27"]);
    expect(days("0 0 0 * * THUL", spring)).toEqual(["Thu 2026-11-26", "Thu 2026-12-31"]);
    expect(days("0 0 0 1W * *", spring)).toEqual(["Mon 2026-11-02", "Tue 2026-12-01"]);
    expect(days("0 0 0 LW * *", spring)).toEqual(["Fri 2026-10-30", "Mon 2026-11-30"]);
    expect(days("0 0 0 ? * 5#2", spring)).toEqual(["Fri 2026-11-13", "Fri 2026-12-11"]);
    expect(days("0 0 0 ? * MON#1", spring)).toEqual(["Mon 2026-11-02", "Mon 2026-12-07"]);
    expect(parseCron("0 0 0 25 DEC ?", spring, from).description).toBe("At 00:00 on day 25 of the month in December");
  });

  it("uses Quartz numbering (1 = Sunday), requires ? and accepts a year field", () => {
    const quartz = { dialect: "quartz" as const, nextRunCount: 2 };
    expect(days("0 15 10 ? * 6L", quartz)).toEqual(["Fri 2026-10-30", "Fri 2026-11-27"]);
    expect(days("0 0 12 ? * 1", quartz)).toEqual(["Sun 2026-11-01", "Sun 2026-11-08"]);
    expect(parseCron("0 15 10 * * 6L", quartz, from).error).toMatch(/needs "\?"/);
    expect(days("0 0 12 * * ? 2027", quartz)).toEqual(["Fri 2027-01-01", "Sat 2027-01-02"]);
  });

  it("computes runs in a time zone and handles both DST transitions", () => {
    expect(parseCron("0 0 9 * * MON-FRI", { dialect: "spring", timezone: "Asia/Kolkata", nextRunCount: 1 }, from).nextRunsLocal).toEqual(["Fri 2026-10-30 09:00:00 GMT+05:30"]);
    // New York falls back on 2026-11-01: 01:30 happens twice but fires once.
    const back = parseCron("0 30 1 * * *", { dialect: "spring", timezone: "America/New_York", nextRunCount: 4 }, from).nextRunsLocal;
    expect(back).toEqual(["Fri 2026-10-30 01:30:00 GMT-04:00", "Sat 2026-10-31 01:30:00 GMT-04:00", "Sun 2026-11-01 01:30:00 GMT-04:00", "Mon 2026-11-02 01:30:00 GMT-05:00"]);
    // And springs forward on 2027-03-14: 02:30 does not exist that day.
    const fwd = parseCron("0 30 2 * * *", { dialect: "spring", timezone: "America/New_York", nextRunCount: 2 }, new Date("2027-03-13T12:00:00Z")).nextRunsLocal;
    expect(fwd).toEqual(["Mon 2027-03-15 02:30:00 GMT-04:00", "Tue 2027-03-16 02:30:00 GMT-04:00"]);
    expect(parseCron("* * * * *", { timezone: "Mars/Olympus" }).error).toMatch(/Unknown time zone/);
  });

  it("explains dialect mix-ups", () => {
    expect(parseCron("0 9 * * *", { dialect: "spring" }).error).toMatch(/start with a seconds field, e\.g\. 0 0 9/);
    expect(parseCron("0 0 9 * * *", { dialect: "unix" }).error).toMatch(/switch the dialect/);
    expect(parseCron("0 9 ? * *", { dialect: "unix" }).error).toMatch(/Spring\/Quartz syntax/);
  });
});

