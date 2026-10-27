import { describe, expect, it } from "vitest";
import { convertIsoDuration, durationToHuman, durationToSeconds, parseIsoDuration, secondsToIso } from "./transform";

describe("parseIsoDuration", () => {
  it("parses all components", () => {
    expect(parseIsoDuration("P1Y2M3DT4H5M6S")).toEqual({
      negative: false, years: 1, months: 2, weeks: 0, days: 3, hours: 4, minutes: 5, seconds: 6,
    });
  });

  it("distinguishes months (before T) from minutes (after T)", () => {
    expect(parseIsoDuration("P5M").months).toBe(5);
    expect(parseIsoDuration("PT5M").minutes).toBe(5);
  });

  it("handles weeks, fractions (dot or comma), sign and lowercase", () => {
    expect(parseIsoDuration("P2W").weeks).toBe(2);
    expect(parseIsoDuration("PT0.5S").seconds).toBe(0.5);
    expect(parseIsoDuration("PT1,5H").hours).toBe(1.5);
    expect(parseIsoDuration("-pt10s")).toMatchObject({ negative: true, seconds: 10 });
  });

  it.each(["", "P", "PT", "P1DT", "1D", "P1H", "PT1D", "P-1D", "PXD", "P1.D"])("rejects %j", (bad) => {
    expect(() => parseIsoDuration(bad)).toThrow();
  });
});

describe("durationToSeconds", () => {
  it("converts fixed-length units exactly", () => {
    expect(durationToSeconds(parseIsoDuration("PT1H30M"))).toBe(5400);
    expect(durationToSeconds(parseIsoDuration("P1DT1S"))).toBe(86_401);
    expect(durationToSeconds(parseIsoDuration("P1W"))).toBe(604_800);
  });

  it("approximates years and months and keeps the sign", () => {
    expect(durationToSeconds(parseIsoDuration("P1Y"))).toBe(31_536_000);
    expect(durationToSeconds(parseIsoDuration("P1M"))).toBe(2_592_000);
    expect(durationToSeconds(parseIsoDuration("-PT5S"))).toBe(-5);
  });

  it("does not leak float noise", () => {
    expect(durationToSeconds(parseIsoDuration("PT0.1H"))).toBe(360);
  });
});

describe("durationToHuman", () => {
  it("pluralises and skips zero units", () => {
    expect(durationToHuman(parseIsoDuration("P1Y2M3DT1H"))).toBe("1 year, 2 months, 3 days, 1 hour");
    expect(durationToHuman(parseIsoDuration("PT0S"))).toBe("0 seconds");
    expect(durationToHuman(parseIsoDuration("-PT1S"))).toBe("minus 1 second");
  });
});

describe("secondsToIso", () => {
  it("builds day/time designators", () => {
    expect(secondsToIso(0)).toBe("PT0S");
    expect(secondsToIso(59)).toBe("PT59S");
    expect(secondsToIso(3600)).toBe("PT1H");
    expect(secondsToIso(90_061)).toBe("P1DT1H1M1S");
    expect(secondsToIso(86_400)).toBe("P1D");
    expect(secondsToIso(1.5)).toBe("PT1.5S");
    expect(secondsToIso(-60)).toBe("-PT1M");
  });

  it("rejects non-finite values", () => {
    expect(() => secondsToIso(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("convertIsoDuration", () => {
  it("covers each mode", () => {
    expect(convertIsoDuration("PT90M", { mode: "iso-to-human" }).output).toBe("90 minutes");
    expect(convertIsoDuration("PT90M", { mode: "iso-to-seconds" }).output).toBe("5400");
    expect(convertIsoDuration("5400", { mode: "seconds-to-iso" }).output).toBe("PT1H30M");
  });

  it("adds an approximation note only when years or months are used", () => {
    expect(convertIsoDuration("P1M", { mode: "iso-to-seconds" }).output).toContain("approximate");
    expect(convertIsoDuration("P1D", { mode: "iso-to-seconds" }).output).not.toContain("approximate");
  });

  it("reports errors and handles empty input", () => {
    expect(convertIsoDuration("banana", { mode: "iso-to-human" }).error).not.toBeNull();
    expect(convertIsoDuration("12x", { mode: "seconds-to-iso" }).error).not.toBeNull();
    expect(convertIsoDuration(" ", { mode: "iso-to-human" })).toEqual({ output: "", error: null });
  });
});
