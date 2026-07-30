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
      relative: "",
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
    expect(result).toEqual({ seconds: "0", milliseconds: "0", error: null });
  });

  it("errors on unparsable input", () => {
    const result = humanToTimestamp("not a date");
    expect(result.error).toBeTruthy();
  });

  it("returns empty result for empty input", () => {
    expect(humanToTimestamp("")).toEqual({ seconds: "", milliseconds: "", error: null });
  });
});
