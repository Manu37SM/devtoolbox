import { describe, expect, it } from "vitest";
import { calculateWeeks, isLeap } from "./transform";

// All four numbering systems were compared with Python (isocalendar, strftime %U/%W and an
// independent US-week implementation) for every day from 1999-12-25 to 2030-01-06; these are
// the interesting year-boundary rows from that run.
const json = (input: string, o = {}) => JSON.parse(calculateWeeks(input, { format: "json", ...o }).output) as Record<string, string | number | boolean>[];

describe("calculateWeeks", () => {
  it.each([
    ["2020-12-31", "2020-W53-4"],
    ["2021-01-01", "2020-W53-5"],
    ["2021-01-03", "2020-W53-7"],
    ["2024-12-30", "2025-W01-1"],
    ["2026-10-30", "2026-W44-5"],
    ["2016-01-01", "2015-W53-5"],
    ["2000-01-01", "1999-W52-6"],
  ])("ISO week of %s is %s", (date, expected) => {
    expect(json(date)[0]!.isoWeek).toBe(expected);
  });
  it("reports the week range, day of year, quarter and leap year", () => {
    const r = json("2024-02-29")[0]!;
    expect(r).toMatchObject({ weekday: "Thursday", week: "2024-W09", weekStart: "2024-02-26", weekEnd: "2024-03-03", dayOfYear: 60, daysLeftInYear: 306, quarter: "Q1", weeksInYear: 52, leapYear: true });
  });
  it("numbers US weeks (Sunday start, week 1 holds Jan 1)", () => {
    const r = json("2021-01-01\n2022-12-31", { system: "us" });
    expect(r[0]!.week).toBe("week 1 of 2021");
    expect(r[0]!.weekStart).toBe("2020-12-27");
    expect(r[1]!.week).toBe("week 53 of 2022");
  });
  it("matches strftime %U and %W, with week 0 before the first full week", () => {
    expect(json("2021-01-01", { system: "unix-sunday" })[0]!.week).toBe("week 0 of 2021");
    expect(json("2021-01-03", { system: "unix-sunday" })[0]!.week).toBe("week 1 of 2021");
    expect(json("2021-01-04", { system: "unix-monday" })[0]!.week).toBe("week 1 of 2021");
  });
  it("supports a custom first weekday and minimum days", () => {
    // Saturday start, week 1 needs 1 day (Middle-East style)
    const r = json("2021-01-01", { system: "custom", firstWeekday: 6, minDays: 1 })[0]!;
    expect(r.week).toBe("week 1 of 2021");
    expect(r.weekStart).toBe("2020-12-26");
  });
  it("converts ISO weeks back to dates and rejects weeks that do not exist", () => {
    const r = json("2026-W44\n2020-W53-5")[0]!;
    expect(r).toMatchObject({ weekStart: "2026-10-26", weekEnd: "2026-11-01", date: "2026-10-26" });
    expect(json("2020-W53-5")[0]!.date).toBe("2021-01-01");
    expect(calculateWeeks("2025-W53", {}).error?.message).toMatch(/2025 has 52 ISO weeks/);
    expect(json("2026-W53")[0]).toMatchObject({ weekStart: "2026-12-28", weekEnd: "2027-01-03" });
  });
  it("lists every week of a year", () => {
    const rows = json("2025", { mode: "weeks" });
    expect(rows).toHaveLength(52);
    expect(rows[0]).toMatchObject({ week: 1, start: "2024-12-30", end: "2025-01-05" });
    expect(json("2020", { mode: "weeks" })).toHaveLength(53);
    expect(json("2026", { mode: "weeks" })).toHaveLength(53);
    expect(json("2021", { mode: "weeks", system: "unix-sunday" })[0]).toMatchObject({ week: 0, start: "2021-01-01", end: "2021-01-02" });
  });
  it("has no week 0 when the year starts on the first weekday", () => {
    // 2023-01-01 is a Sunday
    expect(json("2023", { mode: "weeks", system: "unix-sunday" })[0]).toMatchObject({ week: 1, start: "2023-01-01" });
  });
  it("formats text and CSV, and validates dates", () => {
    expect(calculateWeeks("2026-10-30", {}).output).toContain("2026-W44");
    expect(calculateWeeks("2026-10-30", { format: "csv" }).output.split("\n")[0]).toContain("date,weekday,week");
    expect(calculateWeeks("2026-02-30", {}).error?.message).toMatch(/Line 1: "2026-02-30" is not a valid date/);
    expect(calculateWeeks("hello", { mode: "weeks" }).error?.message).toMatch(/not a year/);
    expect(calculateWeeks("", {})).toEqual({ output: "", error: null });
    expect(isLeap(1900)).toBe(false);
    expect(isLeap(2000)).toBe(true);
  });
});
