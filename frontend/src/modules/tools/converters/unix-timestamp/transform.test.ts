import { describe, expect, it } from "vitest";
import { timestampToHuman, humanToTimestamp } from "./transform";

describe("timestampToHuman", () => {
  it("converts a seconds timestamp to ISO", () => {
    const result = timestampToHuman("0", "seconds");
    expect(result.iso).toBe("1970-01-01T00:00:00.000Z");
  });

  it("converts a milliseconds timestamp to ISO", () => {
    const result = timestampToHuman("1000", "milliseconds");
    expect(result.iso).toBe("1970-01-01T00:00:01.000Z");
  });

  it("returns empty result for empty input", () => {
    expect(timestampToHuman("", "seconds")).toEqual({
      iso: "",
      utc: "",
      local: "",
      zoned: "",
      relative: "",
      unit: null,
      error: null,
    });
  });

  it("errors on non-numeric input", () => {
    const result = timestampToHuman("not-a-number", "seconds");
    expect(result.error).toBeTruthy();
  });

  it("computes relative time", () => {
    const oneHourAgoMs = Date.now() - 3600_000;
    const result = timestampToHuman(String(Math.floor(oneHourAgoMs / 1000)), "seconds", Date.now());
    expect(result.relative).toBe("1 hour ago");
  });

  it("supports negative (pre-1970) timestamps", () => {
    const result = timestampToHuman("-86400", "seconds");
    expect(result.iso).toBe("1969-12-31T00:00:00.000Z");
  });
});

describe("humanToTimestamp", () => {
  it("parses an ISO date string", () => {
    const result = humanToTimestamp("1970-01-01T00:00:00.000Z");
    expect(result).toEqual({ seconds: "0", milliseconds: "0", microseconds: "0", nanoseconds: "0", error: null });
  });

  it("errors on unparsable input", () => {
    const result = humanToTimestamp("not a date");
    expect(result.error).toBeTruthy();
  });

  it("returns empty result for empty input", () => {
    expect(humanToTimestamp("")).toEqual({ seconds: "", milliseconds: "", microseconds: "", nanoseconds: "", error: null });
  });
});

describe("sub-millisecond units and zones", () => {
  it("keeps micro- and nanosecond precision in the ISO string", () => {
    expect(timestampToHuman("1700000000123456", "microseconds").iso).toBe("2023-11-14T22:13:20.123456Z");
    expect(timestampToHuman("1700000000123456789", "nanoseconds").iso).toBe("2023-11-14T22:13:20.123456789Z");
    expect(timestampToHuman("-1", "nanoseconds").iso).toBe("1969-12-31T23:59:59.999999999Z");
  });

  it("detects the unit from the digit count", () => {
    expect(timestampToHuman("1700000000", "auto").unit).toBe("seconds");
    expect(timestampToHuman("1700000000123", "auto").unit).toBe("milliseconds");
    expect(timestampToHuman("1700000000123456", "auto").unit).toBe("microseconds");
    expect(timestampToHuman("1_700_000_000_123_456_789", "auto")).toMatchObject({ unit: "nanoseconds", iso: "2023-11-14T22:13:20.123456789Z" });
  });

  it("formats in a chosen IANA zone with its offset, including DST", () => {
    expect(timestampToHuman("1700000000", "seconds", 0, "Asia/Kolkata").zoned).toBe("2023-11-15 03:43:20 +05:30");
    expect(timestampToHuman("1688000000", "seconds", 0, "America/New_York").zoned).toBe("2023-06-28 20:53:20 -04:00");
    expect(timestampToHuman("1700000000", "seconds", 0, "UTC").zoned).toBe("2023-11-14 22:13:20 +00:00");
    expect(timestampToHuman("1700000000", "seconds", 0, "Mars/Base").error).toContain("Unknown time zone");
  });

  it("rejects values beyond the representable date range", () => {
    expect(timestampToHuman("9999999999999999999", "seconds").error).toContain("out of range");
  });

  it("returns micro- and nanoseconds from a precise ISO date", () => {
    expect(humanToTimestamp("2023-11-14T22:13:20.123456789Z")).toEqual({
      seconds: "1700000000",
      milliseconds: "1700000000123",
      microseconds: "1700000000123456",
      nanoseconds: "1700000000123456789",
      error: null,
    });
  });
});

