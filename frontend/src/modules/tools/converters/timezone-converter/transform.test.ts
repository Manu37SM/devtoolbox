import { describe, expect, it } from "vitest";
import { convertTimezones, parseAsZonedTime } from "./transform";

describe("parseAsZonedTime", () => {
  it("interprets a wall-clock time in UTC as-is", () => {
    const date = parseAsZonedTime("2026-01-01T00:00", "UTC");
    expect(date?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("interprets a wall-clock time in a fixed +5:30 zone (Asia/Kolkata, no DST)", () => {
    const date = parseAsZonedTime("2026-01-01T00:00", "Asia/Kolkata");

    expect(date?.toISOString()).toBe("2025-12-31T18:30:00.000Z");
  });

  it("interprets a wall-clock time with seconds", () => {
    const date = parseAsZonedTime("2026-06-15T12:30:45", "UTC");
    expect(date?.toISOString()).toBe("2026-06-15T12:30:45.000Z");
  });

  it("returns null for a malformed datetime string", () => {
    expect(parseAsZonedTime("not-a-date", "UTC")).toBeNull();
  });

  it("returns null for an unrecognized timezone", () => {
    expect(parseAsZonedTime("2026-01-01T00:00", "Not/AZone")).toBeNull();
  });
});

describe("convertTimezones", () => {
  it("returns no rows and no error for an empty datetime", () => {
    expect(convertTimezones("", "UTC", ["Asia/Tokyo"])).toEqual({ rows: [], error: null });
  });

  it("produces one formatted row per target timezone", () => {
    const result = convertTimezones("2026-01-01T00:00", "UTC", ["Asia/Kolkata", "America/New_York"]);
    expect(result.error).toBeNull();
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.timezone).toBe("Asia/Kolkata");
    expect(result.rows[0]?.formatted.length).toBeGreaterThan(0);
    expect(result.rows[1]?.timezone).toBe("America/New_York");
  });

  it("returns an empty rows list for an empty target list", () => {
    const result = convertTimezones("2026-01-01T00:00", "UTC", []);
    expect(result.error).toBeNull();
    expect(result.rows).toEqual([]);
  });

  it("errors for an invalid source timezone", () => {
    const result = convertTimezones("2026-01-01T00:00", "Not/AZone", ["UTC"]);
    expect(result.error).not.toBeNull();
    expect(result.rows).toEqual([]);
  });

  it("errors for a malformed datetime string", () => {
    const result = convertTimezones("garbage", "UTC", ["UTC"]);
    expect(result.error).not.toBeNull();
  });

  it("round-trips UTC to UTC as the same instant", () => {
    const result = convertTimezones("2026-03-10T08:15", "UTC", ["UTC"]);
    const expected = new Intl.DateTimeFormat(undefined, { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }).format(
      new Date("2026-03-10T08:15:00.000Z"),
    );
    expect(result.rows[0]?.formatted).toBe(expected);
  });
});
