import { describe, expect, it } from "vitest";
import { convertCssLengths, formatNumber, fromPx, toPx } from "./transform";

const opts = { baseFontSize: 16, defaultUnit: "px", target: "all" } as const;

describe("toPx / fromPx", () => {
  it("converts relative units against the base size", () => {
    expect(toPx(1.5, "rem", 16)).toBe(24);
    expect(toPx(2, "em", 10)).toBe(20);
    expect(toPx(150, "%", 16)).toBe(24);
    expect(fromPx(24, "rem", 16)).toBe(1.5);
    expect(fromPx(8, "%", 16)).toBe(50);
  });

  it("treats pt as 4/3 px", () => {
    expect(toPx(12, "pt", 16)).toBe(16);
    expect(fromPx(16, "pt", 16)).toBe(12);
  });
});

describe("formatNumber", () => {
  it("trims noise and negative zero", () => {
    expect(formatNumber(1 / 3)).toBe("0.3333");
    expect(formatNumber(2)).toBe("2");
    expect(formatNumber(-0)).toBe("0");
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
  });
});

describe("convertCssLengths", () => {
  it("shows every unit in 'all' mode", () => {
    expect(convertCssLengths("16", opts).output).toBe("16px  =  1rem  =  1em  =  12pt  =  100%");
  });

  it("honours an explicit unit over the default and a custom base", () => {
    expect(convertCssLengths("2rem", { ...opts, baseFontSize: 10, target: "px" }).output).toBe("20px");
    expect(convertCssLengths("24", { ...opts, defaultUnit: "rem", target: "px" }).output).toBe("384px");
  });

  it("converts a single target per line, preserving blank lines", () => {
    expect(convertCssLengths("8\n\n24px\n.5rem", { ...opts, target: "rem" }).output).toBe("0.5rem\n\n1.5rem\n0.5rem");
  });

  it("accepts case-insensitive units, whitespace, negatives and CRLF", () => {
    expect(convertCssLengths("-16 PX\r\n1REM", { ...opts, target: "rem" }).output).toBe("-1rem\n1rem");
  });

  it("reports the failing line number", () => {
    const r = convertCssLengths("16\nabc", opts);
    expect(r.output).toBe("");
    expect(r.error?.line).toBe(2);
    expect(convertCssLengths("12vw", opts).error).not.toBeNull();
  });

  it("returns empty output for blank input", () => {
    expect(convertCssLengths("\n \n", opts)).toEqual({ output: "", error: null });
  });
});
