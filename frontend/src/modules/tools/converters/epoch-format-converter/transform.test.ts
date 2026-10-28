import { describe, expect, it } from "vitest";
import type { EpochFormatConverterOptions } from "./schema";
import { decToBig, isoFromNanos, runEpochConverter } from "./transform";

const val = (out: string, label: string) => out.split("\n").find((l) => l.startsWith(label))!.slice(label.length).trim();
const run = (s: string, from: EpochFormatConverterOptions["from"] = "unix-s") => runEpochConverter(s, { from });

// Reference values for 1700000000 computed independently in Python.
describe("1700000000 reference", () => {
  const out = run("1700000000").output;
  it("matches", () => {
    expect(val(out, "ISO 8601 (UTC)")).toBe("2023-11-14T22:13:20Z");
    expect(val(out, "Weekday (UTC)")).toBe("Tuesday");
    expect(val(out, "Unix milliseconds")).toBe("1700000000000");
    expect(val(out, "Windows FILETIME / LDAP")).toBe("133444736000000000");
    expect(val(out, ".NET ticks")).toBe("638355968000000000");
    expect(val(out, "WebKit / Chrome (us since 1601)")).toBe("13344473600000000");
    expect(val(out, "Apple Cocoa (s since 2001)")).toBe("721692800");
    expect(val(out, "GPS seconds (no leap seconds)")).toBe("1384035200");
    expect(val(out, "Excel serial (1900 system)")).toBe("45244.925925");
    expect(val(out, "Julian Day")).toBe("2460263.425925");
  });
});

describe("round trips from every source", () => {
  const cases: Array<[EpochFormatConverterOptions["from"], string]> = [
    ["unix-ms", "1700000000000"], ["unix-us", "1700000000000000"], ["unix-ns", "1700000000000000000"],
    ["windows-filetime", "133444736000000000"], ["dotnet-ticks", "638355968000000000"], ["webkit", "13344473600000000"],
    ["apple-cocoa", "721692800"], ["gps-seconds", "1384035200"], ["iso", "2023-11-14T22:13:20Z"],
    ["excel-serial", "45244.92592592593"], ["julian-day", "2460263.5"],
  ];
  for (const [from, v] of cases) it(from, () => {
    const out = run(v, from).output;
    if (from === "excel-serial") expect(val(out, "ISO 8601 (UTC)")).toMatch(/^2023-11-14T22:13:20(\.\d+)?Z$|^2023-11-14T22:13:19\.9/);
    else if (from === "julian-day") expect(val(out, "ISO 8601 (UTC)")).toBe("2023-11-15T00:00:00Z");
    else expect(val(out, "ISO 8601 (UTC)")).toBe("2023-11-14T22:13:20Z");
  });
});

describe("edges", () => {
  it("negative and fractional", () => {
    expect(val(run("-1").output, "ISO 8601 (UTC)")).toBe("1969-12-31T23:59:59Z");
    expect(val(run("-1").output, "Weekday (UTC)")).toBe("Wednesday");
    expect(val(run("1.5").output, "ISO 8601 (UTC)")).toBe("1970-01-01T00:00:01.500Z");
    expect(val(run("1700000000123456789", "unix-ns").output, "ISO 8601 (UTC)")).toBe("2023-11-14T22:13:20.123456789Z");
  });
  it("errors", () => {
    expect(run("abc").error?.message).toMatch(/Cannot read/);
    expect(run("1e30", "unix-s").error).not.toBeNull();
    expect(run("99999999999999999999", "unix-s").error?.message).toMatch(/range/);
    expect(run("")).toEqual({ output: "", error: null });
  });
  it("helpers", () => {
    expect(decToBig("1.5", 9)).toBe(1_500_000_000n);
    expect(decToBig("-0.25", 3)).toBe(-250n);
    expect(decToBig(".", 3)).toBeNull();
    expect(isoFromNanos(0n)).toBe("1970-01-01T00:00:00Z");
  });
});
