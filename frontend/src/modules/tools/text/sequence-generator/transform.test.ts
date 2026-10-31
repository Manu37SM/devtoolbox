import { describe, expect, it } from "vitest";
import { formatDate, letterAt, letterIndex, sequenceGenerator } from "./transform";

const run = (o: Parameters<typeof sequenceGenerator>[1]) => sequenceGenerator("", o);
const lines = (o: Parameters<typeof sequenceGenerator>[1]) => run(o).output.split("\n");

describe("numbers", () => {
  it("counts up inclusive of end", () => {
    expect(lines({ start: 1, end: 5 })).toEqual(["1", "2", "3", "4", "5"]);
  });
  it("counts down with a negative step", () => {
    expect(lines({ start: 10, end: 0, step: -5 })).toEqual(["10", "5", "0"]);
  });
  it("handles fractional steps without float drift (numpy.arange(0, 1.01, 0.25))", () => {
    expect(lines({ start: 0, end: 1, step: 0.25, decimals: 2 })).toEqual(["0.00", "0.25", "0.50", "0.75", "1.00"]);
    expect(lines({ start: 0, end: 1, step: 0.1, decimals: 1 })).toHaveLength(11);
  });
  it("uses count instead of end, with padding, prefix and suffix", () => {
    expect(lines({ start: 8, count: 3, padWidth: 3, prefix: "id-", suffix: ".txt" })).toEqual(["id-008.txt", "id-009.txt", "id-010.txt"]);
  });
  it("rejects zero step and huge outputs", () => {
    expect(run({ step: 0 }).error?.message).toMatch(/Step cannot be 0/);
    expect(run({ start: 1, end: 1e9 }).error?.message).toMatch(/more than/);
  });
  it("reverses, quotes and joins", () => {
    expect(run({ start: 1, end: 3, reverse: true, quote: "single", separator: "comma-space" }).output).toBe("'3', '2', '1'");
    expect(run({ start: 1, end: 3, separator: "custom", customSeparator: " + " }).output).toBe("1 + 2 + 3");
  });
  it("shuffles repeatably with a seed and keeps every item", () => {
    const a = run({ start: 1, end: 20, shuffle: true, seed: 42 }).output;
    expect(run({ start: 1, end: 20, shuffle: true, seed: 42 }).output).toBe(a);
    expect(a.split("\n").map(Number).sort((x, y) => x - y)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(a).not.toBe(run({ start: 1, end: 20 }).output);
  });
});

describe("letters", () => {
  it("matches spreadsheet columns", () => {
    expect([1, 26, 27, 52, 53, 702, 703].map(letterAt)).toEqual(["a", "z", "aa", "az", "ba", "zz", "aaa"]);
    expect(letterIndex("AAA")).toBe(703);
  });
  it("generates a range, upper-case, starting anywhere", () => {
    expect(lines({ kind: "letters", end: 5 })).toEqual(["a", "b", "c", "d", "e"]);
    expect(lines({ kind: "letters", letterFrom: "y", count: 4, letterCase: "upper" })).toEqual(["Y", "Z", "AA", "AB"]);
    expect(lines({ kind: "letters", end: 10, step: 3 })).toEqual(["a", "d", "g", "j"]);
  });
});

describe("dates (month math matches dateutil.relativedelta)", () => {
  it("clamps month ends from the start date", () => {
    expect(lines({ kind: "dates", startDate: "2026-01-31", dateStepUnit: "month", count: 5 })).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
    expect(lines({ kind: "dates", startDate: "2024-02-29", dateStepUnit: "year", count: 3 })).toEqual(["2024-02-29", "2025-02-28", "2026-02-28"]);
  });
  it("steps days and weeks, and skips weekends", () => {
    expect(lines({ kind: "dates", startDate: "2026-10-30", count: 4, weekdaysOnly: true })).toEqual(["2026-10-30", "2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(lines({ kind: "dates", startDate: "2026-01-01", dateStepUnit: "week", count: 2, step: 2 })).toEqual(["2026-01-01", "2026-01-15"]);
    expect(lines({ kind: "dates", startDate: "2026-01-01", dateStepUnit: "quarter", count: 3 })).toEqual(["2026-01-01", "2026-04-01", "2026-07-01"]);
  });
  it("formats with tokens and quoted text", () => {
    const d = new Date(Date.UTC(2026, 9, 31));
    expect(formatDate(d, "EEE, d MMM yyyy")).toBe("Sat, 31 Oct 2026");
    expect(formatDate(d, "EEEE dd/MM/yy 'week'")).toBe("Saturday 31/10/26 week");
  });
  it("rejects invalid dates", () => {
    expect(run({ kind: "dates", startDate: "2026-02-30" }).error).not.toBeNull();
    expect(run({ kind: "dates", startDate: "nope" }).error?.message).toMatch(/YYYY-MM-DD/);
  });
});

describe("template", () => {
  it("fills number and letter placeholders", () => {
    expect(lines({ kind: "template", template: "user_{n:3}@{a}.test", start: 1, end: 3 })).toEqual(["user_001@a.test", "user_002@b.test", "user_003@c.test"]);
    expect(lines({ kind: "template", template: "{A}{n}", start: 1, count: 2 })).toEqual(["A1", "B2"]);
  });
  it("requires a placeholder", () => {
    expect(run({ kind: "template", template: "static" }).error?.message).toMatch(/placeholder/);
  });
});
