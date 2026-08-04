import { describe, expect, it } from "vitest";
import { analyzePassword } from "./transform";

describe("analyzePassword", () => {
  it("returns very weak with guidance for empty input", () => {
    const result = analyzePassword("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("Very Weak");
    expect(result.entropyBits).toBe(0);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it("flags a very common password as very weak", () => {
    const result = analyzePassword("password");
    expect(result.score).toBe(0);
    expect(result.label).toBe("Very Weak");
    expect(result.feedback.some((f) => /common/i.test(f))).toBe(true);
  });

  it("flags another common password/word (case-insensitive)", () => {
    const result = analyzePassword("Password123");
    expect(result.feedback.some((f) => /common/i.test(f))).toBe(true);
  });

  it("flags sequential characters", () => {
    const result = analyzePassword("abcd1234");
    expect(result.feedback.some((f) => /sequential|repeated/i.test(f))).toBe(true);
  });

  it("flags repeated characters", () => {
    const result = analyzePassword("aaaaaaaa");
    expect(result.feedback.some((f) => /sequential|repeated/i.test(f))).toBe(true);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("scores a short low-diversity password as weak", () => {
    const result = analyzePassword("abc");
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("scores a long random high-diversity password as strong", () => {
    const result = analyzePassword("xQ7!vR2#pL9$zT4@wK1&");
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.label === "Strong" || result.label === "Very Strong").toBe(true);
  });

  it("increases score as character-class diversity increases", () => {
    const lowerOnly = analyzePassword("abcdefghij");
    const mixed = analyzePassword("Abcdefg1!j");
    expect(mixed.score).toBeGreaterThanOrEqual(lowerOnly.score);
  });

  it("suggests adding missing character classes", () => {
    const result = analyzePassword("alllowercase");
    expect(result.feedback.some((f) => /uppercase/i.test(f))).toBe(true);
    expect(result.feedback.some((f) => /number/i.test(f))).toBe(true);
    expect(result.feedback.some((f) => /symbol/i.test(f))).toBe(true);
  });

  it("provides a human-readable crack time estimate", () => {
    const result = analyzePassword("Tr0ub4dor&3xyzLmn");
    expect(typeof result.crackTimeEstimate).toBe("string");
    expect(result.crackTimeEstimate.length).toBeGreaterThan(0);
  });

  it("returns 'Great password!' feedback when no issues are found", () => {
    const result = analyzePassword("xQ7!vR2#pL9$zT4@wK1&");
    expect(result.feedback).toContain("Great password!");
  });
});
