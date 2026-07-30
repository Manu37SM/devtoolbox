import { describe, expect, it } from "vitest";
import { generatePassword } from "./transform";

const defaultOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
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
});
