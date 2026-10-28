import { describe, expect, it } from "vitest";
import { compareEnvFiles, maskValue, parseEnvFile } from "./transform";

const o = { showValues: false, showSame: false };

describe("parseEnvFile", () => {
  it("handles export, quotes, comments and duplicates", () => {
    const p = parseEnvFile("# c\nexport A=1\nB='two words'\nC=\"x # y\"\nD=val # trailing\nA=2\nbad line");
    expect(Object.fromEntries(p.values)).toEqual({ A: "2", B: "two words", C: "x # y", D: "val" });
    expect(p.duplicates).toEqual(["A"]);
    expect(p.invalid).toEqual(["bad line"]);
  });
  it("masks values", () => {
    expect(maskValue("")).toBe("(empty)");
    expect(maskValue("abc")).toBe("••••");
    expect(maskValue("supersecret")).toBe("s••••t (11 chars)");
  });
});

describe("compareEnvFiles", () => {
  const text = "DB_URL=postgres://a\nAPI_KEY=abc123456\nONLY_A=1\nSAME=x\n---\nDB_URL=postgres://b\nAPI_KEY=abc123456\nONLY_B=\nSAME=x";
  it("reports differences with masked values by default", () => {
    const r = compareEnvFiles(text, o);
    expect(r.error).toBeNull();
    expect(r.output).toContain("Only in A (1)\n  ONLY_A = ••••");
    expect(r.output).toContain("Only in B (1)\n  ONLY_B = (empty)");
    expect(r.output).toContain("Different values (1)\n  DB_URL");
    expect(r.output).not.toContain("postgres://a");
    expect(r.output).not.toContain("Identical");
    expect(r.output).toContain("B: empty values: ONLY_B");
  });
  it("can reveal values and list identical keys", () => {
    const r = compareEnvFiles(text, { showValues: true, showSame: true });
    expect(r.output).toContain('A: "postgres://a"');
    expect(r.output).toContain("Identical (2)");
  });
  it("detects identical files and missing separators", () => {
    expect(compareEnvFiles("A=1\n---\nA=1", o).output).toContain("same variables with the same values");
    expect(compareEnvFiles("A=1", o).error?.message).toContain("---");
  });
});
