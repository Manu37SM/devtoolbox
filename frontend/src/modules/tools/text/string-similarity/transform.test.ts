import { describe, expect, it } from "vitest";
import { compareInput, damerauOsa, diceAndJaccard, jaro, jaroWinkler, lcsLength, levenshtein, soundex } from "./transform";

describe("edit distances", () => {
  it("matches classic examples", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("flaw", "lawn")).toBe(2);
    expect(damerauOsa("ca", "ac")).toBe(1);
    expect(levenshtein("ca", "ac")).toBe(2);
    expect(damerauOsa("abcd", "acbd")).toBe(1);
  });
  it("handles astral characters", () => {
    expect(levenshtein("a😀b", "a😁b")).toBe(1);
  });
  it("LCS", () => {
    expect(lcsLength("AGGTAB", "GXTXAYB")).toBe(4);
  });
});

describe("Jaro / Jaro–Winkler", () => {
  it("matches published values", () => {
    expect(jaro("MARTHA", "MARHTA")).toBeCloseTo(0.9444, 4);
    expect(jaroWinkler("MARTHA", "MARHTA")).toBeCloseTo(0.9611, 4);
    expect(jaro("DWAYNE", "DUANE")).toBeCloseTo(0.8222, 4);
    expect(jaroWinkler("DIXON", "DICKSONX")).toBeCloseTo(0.8133, 4);
    expect(jaro("abc", "xyz")).toBe(0);
    expect(jaro("", "")).toBe(1);
  });
});

describe("bigram measures", () => {
  it("Dice for night/nacht is 0.25", () => {
    expect(diceAndJaccard("night", "nacht").dice).toBeCloseTo(0.25, 6);
    expect(diceAndJaccard("abc", "abc")).toEqual({ dice: 1, jaccard: 1 });
  });
});

describe("soundex", () => {
  it("matches the standard examples", () => {
    expect(soundex("Robert")).toBe("R163");
    expect(soundex("Rupert")).toBe("R163");
    expect(soundex("Rubin")).toBe("R150");
    expect(soundex("Tymczak")).toBe("T522");
    expect(soundex("Pfister")).toBe("P236");
    expect(soundex("Honeyman")).toBe("H555");
    expect(soundex("Ashcraft")).toBe("A261");
  });
});

describe("compareInput", () => {
  it("compares the first line with the others", () => {
    const r = compareInput("Robert\nRupert\nrobert", { ignoreCase: true });
    expect(r.output).toContain('"Robert"  vs  "Rupert"');
    expect(r.output).toContain("(sound alike)");
    expect(r.output).toContain("Levenshtein distance:  0   similarity 100.0%");
    expect(compareInput("only one", { ignoreCase: true }).error).not.toBeNull();
  });
});
