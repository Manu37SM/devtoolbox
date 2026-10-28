import { describe, expect, it } from "vitest";
import { parseNumberToken, runNumberFormatter } from "./transform";

const base = { locale: "en-US" as const, style: "decimal" as const, currency: "USD" as const, notation: "standard" as const, compactDisplay: "short" as const, minFraction: 0, maxFraction: 3, grouping: true, compareLocales: false };
const run = (s: string, o = {}) => runNumberFormatter(s, { ...base, ...o });

describe("runNumberFormatter", () => {
  it("groups and rounds per locale", () => {
    expect(run("1234567.8912").output).toBe("1,234,567.891");
    expect(run("1234567.891", { locale: "en-IN" }).output).toBe("12,34,567.891");
    expect(run("1234567.891", { locale: "de-DE" }).output).toBe("1.234.567,891");
  });
  it("currency, percent, compact, scientific", () => {
    expect(run("1234.5", { style: "currency", minFraction: 2, maxFraction: 2 }).output).toBe("$1,234.50");
    expect(run("1234.5", { style: "currency", currency: "INR", locale: "en-IN", minFraction: 2, maxFraction: 2 }).output).toBe("₹1,234.50");
    expect(run("0.256", { style: "percent", maxFraction: 1 }).output).toBe("25.6%");
    expect(run("1234567", { notation: "compact", maxFraction: 1 }).output).toBe("1.2M");
    expect(run("1234567", { notation: "compact", compactDisplay: "long", maxFraction: 1 }).output).toBe("1.2 million");
    expect(run("12345", { notation: "scientific", maxFraction: 2 }).output).toBe("1.23E4");
  });
  it("grouping off, fixed decimals", () => {
    expect(run("1234567", { grouping: false }).output).toBe("1234567");
    expect(run("2", { minFraction: 2 }).output).toBe("2.00");
  });
  it("multi-line and compare mode", () => {
    expect(run("1\n\n1000").output).toBe("1\n\n1,000");
    const c = run("1234.5", { compareLocales: true }).output;
    expect(c).toContain("en-IN");
    expect(c).toMatch(/de-DE\s+1\.234,5/);
  });
  it("errors", () => {
    expect(run("1,234").error?.line).toBe(1);
    expect(run("1\nabc").error?.line).toBe(2);
    expect(run("1", { minFraction: 5, maxFraction: 2 }).error?.message).toMatch(/Minimum/);
    expect(parseNumberToken("1e3")).toBe(1000);
    expect(parseNumberToken("NaN")).toBeNull();
  });
});
