import { describe, expect, it } from "vitest";
import { analyzeReadability, countSyllables, gradeLabel, runReadability, splitSentences, tokenizeWords } from "./transform";

describe("helpers", () => {
  it("counts syllables on common words", () => {
    const cases: Record<string, number> = { cat: 1, the: 1, water: 2, table: 2, readability: 5, beautiful: 3, wanted: 2, jumped: 1, make: 1, simple: 2, university: 5 };
    for (const [w, n] of Object.entries(cases)) expect([w, countSyllables(w)]).toEqual([w, n]);
  });
  it("splits sentences without breaking on abbreviations", () => {
    expect(splitSentences("Dr. Smith went home. He slept! Did he? Yes.")).toHaveLength(4);
  });
  it("tokenises words with apostrophes and hyphens", () => {
    expect(tokenizeWords("Don't stop re-reading, 42 times.")).toEqual(["Don't", "stop", "re-reading", "42", "times"]);
  });
  it("labels grade bands", () => {
    expect(gradeLabel(95)).toContain("Very easy");
    expect(gradeLabel(10)).toContain("graduate");
  });
});

describe("analyzeReadability", () => {
  it("matches the textbook value for a one-syllable sentence", () => {
    const r = analyzeReadability("The cat sat on the mat.");
    expect(r.words).toBe(6);
    expect(r.sentences).toBe(1);
    expect(r.syllables).toBe(6);
    expect(r.fre).toBeCloseTo(116.145, 3);
    expect(r.fk).toBeCloseTo(0.39 * 6 + 11.8 - 15.59, 6);
  });
  it("scores harder prose as harder", () => {
    const easy = analyzeReadability("I like dogs. Dogs are fun. We play all day.");
    const hard = analyzeReadability("Notwithstanding considerable methodological heterogeneity, comprehensive epidemiological investigations demonstrated statistically significant associations.");
    expect(hard.fre).toBeLessThan(easy.fre);
    expect(hard.fk).toBeGreaterThan(easy.fk);
  });
});

describe("runReadability", () => {
  it("renders a report and handles empty or wordless input", () => {
    const r = runReadability("The cat sat on the mat.", { showFormulas: true });
    expect(r.output).toContain("Flesch Reading Ease:        116.1");
    expect(r.output).toContain("Note: scores are unreliable");
    expect(r.output).toContain("FRE = 206.835");
    expect(runReadability("", { showFormulas: false }).output).toBe("");
    expect(runReadability("!!! ???", { showFormulas: false }).error).not.toBeNull();
  });
});
