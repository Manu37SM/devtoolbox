import { describe, expect, it } from "vitest";
import { generatePassword } from "./transform";

const defaultOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
  excludeChars: "",
  symbolSet: "full" as const,
  requireEach: false,
  count: 1,
};

describe("generatePassword", () => {
  it("generates a password of the requested length", () => {
    const result = generatePassword(defaultOptions);
    expect(result.error).toBeNull();
    expect(result.password).toHaveLength(20);
  });

  it("only uses lowercase when other sets are disabled", () => {
    const result = generatePassword({ ...defaultOptions, uppercase: false, numbers: false, symbols: false });
    expect(result.password).toMatch(/^[a-z]+$/);
  });

  it("excludes ambiguous characters when requested", () => {
    const result = generatePassword({
      ...defaultOptions,
      length: 200,
      excludeAmbiguous: true,
    });
    expect(result.password).not.toMatch(/[Il1O0o]/);
  });

  it("computes entropy proportional to pool size and length", () => {
    const small = generatePassword({ ...defaultOptions, uppercase: false, numbers: false, symbols: false, length: 10 });
    const large = generatePassword({ ...defaultOptions, length: 10 });
    expect(large.entropyBits).toBeGreaterThan(small.entropyBits);
  });

  it("errors when no character set is enabled", () => {
    const result = generatePassword({
      ...defaultOptions,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
    });
    expect(result.error).toBeTruthy();
    expect(result.password).toBe("");
  });

  it("respects a minimum length of 4 and maximum of 128", () => {
    const min = generatePassword({ ...defaultOptions, length: 4 });
    const max = generatePassword({ ...defaultOptions, length: 128 });
    expect(min.password).toHaveLength(4);
    expect(max.password).toHaveLength(128);
  });

  it("never uses excluded characters and keeps safe symbols to - _ . ~", () => {
    const r = generatePassword({ ...defaultOptions, length: 128, excludeChars: "\"'$`\\", symbolSet: "safe" });
    expect(r.password).not.toMatch(/["'$`\\]/);
    expect(r.password).toMatch(/^[A-Za-z0-9\-_.~]+$/);
  });

  it("includes every enabled type when required", () => {
    for (let i = 0; i < 50; i++) {
      const p = generatePassword({ ...defaultOptions, length: 4, requireEach: true }).password;
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it("explains impossible requirements", () => {
    expect(generatePassword({ ...defaultOptions, length: 3, requireEach: true }).error).toMatch(/too short/);
    expect(generatePassword({ ...defaultOptions, numbers: true, excludeChars: "0123456789", requireEach: true }).error).toMatch(/excluded/);
  });

  it("generates several distinct passwords", () => {
    const r = generatePassword({ ...defaultOptions, count: 5 });
    expect(r.passwords).toHaveLength(5);
    expect(new Set(r.passwords).size).toBe(5);
    expect(r.password.split("\n")).toEqual(r.passwords);
  });
});

