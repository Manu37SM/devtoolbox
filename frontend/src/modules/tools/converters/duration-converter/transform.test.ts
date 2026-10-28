import { describe, expect, it } from "vitest";
import { clockFormat, convertDurations, humanize, isoDuration, parseDuration } from "./transform";

describe("parseDuration", () => {
  it("parses compound human forms", () => {
    expect(parseDuration("1h 30m")).toBe(5_400_000);
    expect(parseDuration("2 days, 3 hours and 4 minutes")).toBe(2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000);
    expect(parseDuration("1.5h")).toBe(5_400_000);
    expect(parseDuration("500ms")).toBe(500);
    expect(parseDuration("1w")).toBe(604_800_000);
  });
  it("parses clock and ISO forms", () => {
    expect(parseDuration("01:02:03")).toBe(3_723_000);
    expect(parseDuration("2:30")).toBe(150_000);
    expect(parseDuration("1:00:00.250")).toBe(3_600_250);
    expect(parseDuration("PT1H30M")).toBe(5_400_000);
    expect(parseDuration("P1DT12H")).toBe(129_600_000);
  });
  it("uses the default unit for bare numbers and supports negatives", () => {
    expect(parseDuration("90")).toBe(90_000);
    expect(parseDuration("90", "min")).toBe(5_400_000);
    expect(parseDuration("-1h")).toBe(-3_600_000);
  });
  it("rejects junk", () => {
    expect(parseDuration("soon")).toBeNull();
    expect(parseDuration("5 parsecs")).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("P")).toBeNull();
  });
});

describe("formatters", () => {
  it("humanize / clock / iso", () => {
    expect(humanize(90_061_001)).toBe("1 day 1 hour 1 minute 1 second 1 millisecond");
    expect(humanize(0)).toBe("0 seconds");
    expect(clockFormat(3_723_450)).toBe("01:02:03.450");
    expect(clockFormat(100 * 3_600_000)).toBe("100:00:00");
    expect(isoDuration(90_061_000)).toBe("P1DT1H1M1S");
    expect(isoDuration(1500)).toBe("PT1.5S");
    expect(isoDuration(0)).toBe("PT0S");
  });
});

describe("convertDurations", () => {
  it("renders a block per line", () => {
    const r = convertDurations("1h 30m\nnonsense", { defaultUnit: "s" });
    expect(r.output).toContain("Human:     1 hour 30 minutes");
    expect(r.output).toContain("= 90 min = 1.5 h");
    expect(r.error?.message).toContain("nonsense");
  });
});
