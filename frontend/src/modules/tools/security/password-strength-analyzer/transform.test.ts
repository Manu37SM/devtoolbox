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

describe("analyzePassword options", () => {
  it("reports crack time for each attack scenario", () => {
    const r = analyzePassword("Tr0ub4dor&3xyzQ");
    expect(r.crackTimes!.map((c) => c.scenario)).toEqual(["online-throttled", "online", "offline-slow", "offline-fast"]);
    expect(analyzePassword("Tr0ub4dor&3xyzQ", { scenario: "online-throttled" }).crackTimeEstimate).toBe(r.crackTimes![0]!.time);
    expect(analyzePassword("abcXYZ12", { scenario: "offline-fast" }).crackTimeEstimate).not.toBe(analyzePassword("abcXYZ12", { scenario: "online" }).crackTimeEstimate);
  });

  it("catches leetspeak spellings of common passwords", () => {
    const r = analyzePassword("P@ssw0rd!");
    expect(r.score).toBe(0);
    expect(r.feedback).toContain("Avoid common passwords or dictionary words.");
  });

  it("penalises words tied to the user", () => {
    const base = analyzePassword("Acmecorp#2026!x");
    const r = analyzePassword("Acmecorp#2026!x", { userInputs: "Jane Doe, jane@acmecorp.com" });
    expect(r.entropyBits).toBeLessThan(base.entropyBits);
    expect(r.feedback.join(" ")).toContain("acmecorp");
    expect(r.score).toBeLessThanOrEqual(2);
  });

  it("checks NIST, PCI and custom policies", () => {
    expect(analyzePassword("Summer2026x!", { policy: "pci" }).policy).toEqual({ name: "PCI DSS 4.0", passed: true, failures: [] });
    expect(analyzePassword("abcdefghijklmno", { policy: "pci" }).policy?.failures).toEqual(["Must contain numbers."]);
    expect(analyzePassword("correct horse battery", { policy: "nist" }).policy?.passed).toBe(true);
    expect(analyzePassword("Short1!", { policy: "nist" }).policy?.passed).toBe(false);
    expect(analyzePassword("abcdefgh", { policy: "custom", customMinLength: 10 }).policy?.failures[0]).toBe("At least 10 characters.");
    expect(analyzePassword("abc").policy).toBeUndefined();
  });
});

