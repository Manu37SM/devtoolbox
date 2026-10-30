import { describe, expect, it } from "vitest";
import { calcPercentage } from "./transform";

const run = (s: string) => calcPercentage(s, {});

describe("calcPercentage", () => {
  it.each([
    ["20% of 150", "30"],
    ["12.5% of 80", "10"],
    ["30 is what % of 120", "25%"],
    ["1 is what % of 3", "33.333333%"],
    ["25% off 80", "60"],
    ["increase 100 by 15%", "115"],
    ["decrease 100 by 15%", "85"],
    ["from 80 to 100", "+25%"],
    ["from 100 to 80", "-20%"],
    ["change from 50 to 50", "+0%"],
    ["20 % of 1,500", "300"],
  ])("%s = %s", (q, a) => {
    expect(run(q).output).toBe(`${q}  =  ${a}`);
  });

  it("uses the magnitude of a negative base for percent change", () => {
    expect(run("from -50 to -25").output).toContain("+50%");
  });
  it("reports division by zero with the line number", () => {
    expect(run("5 is what % of 0").error).toEqual({ message: "Cannot divide by zero.", line: 1 });
    expect(run("ok\n").error).not.toBeNull();
    expect(run("1% of 1\nfrom 0 to 5").error?.line).toBe(2);
  });
  it("explains unrecognised phrases and ignores blank input", () => {
    expect(run("what is love").error?.message).toContain("20% of 150");
    expect(run("  ")).toEqual({ output: "", error: null });
  });
  it("avoids floating point noise", () => {
    expect(run("0.1% of 300").output).toBe("0.1% of 300  =  0.3");
  });
});

describe("calcPercentage — more phrases and options", () => {
  it.each([
    ["30 is 20% of what", "150"],
    ["200 + 18%", "236"],
    ["200 - 10%", "180"],
    ["margin 80 price 100", "20% margin, 25% markup"],
    ["margin cost 75, 100", "25% margin, 33.333333% markup"],
  ])("%s = %s", (q, a) => {
    expect(run(q).output).toBe(`${q}  =  ${a}`);
  });

  it("controls decimals, grouping and output style", () => {
    expect(calcPercentage("1 is what % of 3", { decimals: 2 }).output).toBe("1 is what % of 3  =  33.33%");
    expect(calcPercentage("15% of 12,345,678", { grouping: true }).output).toBe("15% of 12,345,678  =  1,851,851.7");
    expect(calcPercentage("20% of 150\n10% of 50", { output: "result" }).output).toBe("30\n5");
  });
});

