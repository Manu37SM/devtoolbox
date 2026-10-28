import { describe, expect, it } from "vitest";
import { parseVector, roundUp, runCvss, scoreVector, severity } from "./transform";

describe("scoreVector (reference scores from the NVD / FIRST examples)", () => {
  it.each([
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", 9.8],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", 6.1],
    ["CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N", 5.5],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H", 10.0],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N", 0],
    ["CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", 9.8],
  ])("%s → %s", (v, s) => {
    expect(scoreVector(v).base).toBe(s);
  });
});

describe("helpers", () => {
  it("roundUp follows the 3.1 spec", () => {
    expect(roundUp(4.02)).toBe(4.1);
    expect(roundUp(4.0)).toBe(4.0);
    expect(roundUp(4.000001)).toBe(4.0);
  });
  it("severity bands", () => {
    expect([0, 0.1, 3.9, 4, 6.9, 7, 8.9, 9, 10].map(severity)).toEqual(["None", "Low", "Low", "Medium", "Medium", "High", "High", "Critical", "Critical"]);
  });
  it("rejects bad vectors", () => {
    expect(() => parseVector("AV:N")).toThrow(/CVSS:3/);
    expect(() => parseVector("CVSS:4.0/AV:N")).toThrow(/v4.0/);
    expect(() => parseVector("CVSS:3.1/AV:N/AC:L")).toThrow(/Missing base metric PR/);
    expect(() => parseVector("CVSS:3.1/AV:X/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toThrow(/Invalid value/);
    expect(() => parseVector("CVSS:3.1/AV:N/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toThrow(/Duplicate/);
  });
});

describe("runCvss", () => {
  it("formats results and reports the first bad line", () => {
    const r = runCvss("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H\nnope", { showBreakdown: true });
    expect(r.output).toContain("Base score: 9.8 (Critical)");
    expect(r.output).toContain("Attack Vector: Network");
    expect(r.error?.line).toBe(2);
  });
  it("hides the breakdown when asked", () => {
    expect(runCvss("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", { showBreakdown: false }).output).not.toContain("Exploitability");
  });
});
