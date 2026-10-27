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
