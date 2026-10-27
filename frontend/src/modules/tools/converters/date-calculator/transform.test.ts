import { describe, expect, it } from "vitest";
import { addMonths, businessDays, calcDates, parseDate } from "./transform";

const o = { inclusive: false } as const;

describe("helpers", () => {
  it("parses only real calendar dates", () => {
    expect(parseDate("2024-02-29")).not.toBeNull();
    expect(parseDate("2025-02-29")).toBeNull();
    expect(parseDate("2026-13-01")).toBeNull();
    expect(parseDate("26-1-1")).toBeNull();
  });
  it("clamps month arithmetic to the last day of the month", () => {
    const t = (s: string) => parseDate(s)!;
    expect(addMonths(t("2026-01-31"), 1)).toBe(t("2026-02-28"));
    expect(addMonths(t("2024-01-31"), 1)).toBe(t("2024-02-29"));
    expect(addMonths(t("2026-03-31"), -1)).toBe(t("2026-02-28"));
    expect(addMonths(t("2026-11-15"), 3)).toBe(t("2027-02-15"));
  });
  it("counts weekdays", () => {
    // Mon 2026-10-26 -> Mon 2026-11-02 = 5 business days
    expect(businessDays(parseDate("2026-10-26")!, parseDate("2026-11-02")!)).toBe(5);
    expect(businessDays(parseDate("2026-10-31")!, parseDate("2026-11-01")!)).toBe(0); // Sat -> Sun
  });
});

describe("calcDates", () => {
  it("diffs two dates", () => {
    const out = calcDates("2026-01-01 to 2026-12-25", o).output;
    expect(out).toContain("358 days");
    expect(out).toContain("0y 11m 24d");
  });
  it("handles reversed dates and inclusive counting", () => {
    expect(calcDates("2026-03-01 to 2026-01-01", o).output).toContain("end date is before start date");
    expect(calcDates("2026-01-01 to 2026-01-02", { inclusive: true }).output).toContain("2 days (inclusive)");
  });
  it("adds and subtracts units", () => {
    expect(calcDates("2026-01-31 + 1 month", o).output).toBe("2026-01-31 + 1 month  =  2026-02-28 (Saturday)");
    expect(calcDates("2026-10-27 + 90 days", o).output).toContain("2027-01-25");
    expect(calcDates("2026-10-27 - 2 weeks", o).output).toContain("2026-10-13");
    expect(calcDates("2024-02-29 + 1 year", o).output).toContain("2025-02-28");
  });
  it("skips weekends for business-day arithmetic", () => {
    // Fri 2026-10-30 + 1 business day = Mon 2026-11-02
    expect(calcDates("2026-10-30 + 1 business day", o).output).toContain("2026-11-02 (Monday)");
    expect(calcDates("2026-11-02 - 1 business day", o).output).toContain("2026-10-30 (Friday)");
  });
  it("validates input", () => {
    expect(calcDates("2026-02-30 to 2026-03-01", o).error?.message).toMatch(/real dates/);
    expect(calcDates("hello", o).error?.line).toBe(1);
    expect(calcDates("", o)).toEqual({ output: "", error: null });
  });
});
