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
    expect(parseCron("", 5)).toEqual({ valid: false, error: null, description: null, nextRuns: [] });
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
});
