import { describe, expect, it } from "vitest";
import { EFF_WORDLIST } from "./wordlist";
import { entropyBits, generatePassphrases, makePassphrase, randomBelow, strengthLabel } from "./transform";

const base = { words: 6, count: 3, separator: "hyphen", capitalize: false, addNumber: false } as const;

describe("EFF wordlist", () => {
  it("has 7776 unique lowercase words in dice order", () => {
    expect(EFF_WORDLIST).toHaveLength(7776);
    expect(new Set(EFF_WORDLIST).size).toBe(7776);
    expect(EFF_WORDLIST.every((w) => /^[a-z-]{3,9}$/.test(w))).toBe(true);
    expect(EFF_WORDLIST[0]).toBe("abacus");
    expect(EFF_WORDLIST[7775]).toBe("zoom");
  });
});

describe("randomBelow", () => {
  it("maps via modulo for accepted values and re-draws values in the biased tail", () => {
    expect(randomBelow(10, () => 123)).toBe(3);
    // n=7776: limit = floor(2^32 / 7776) * 7776; anything >= limit must be rejected
    const limit = Math.floor(2 ** 32 / 7776) * 7776;
    const draws = [limit, 0xffffffff, 5];
    expect(randomBelow(7776, () => draws.shift()!)).toBe(5);
    expect(draws).toHaveLength(0);
  });
  it("is statistically uniform for a small n", () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 30_000; i++) counts[randomBelow(3)]!++;
    for (const c of counts) expect(c).toBeGreaterThan(9_000);
  });
});

describe("makePassphrase", () => {
  it("uses the injected source deterministically (index 0 = abacus, 1 = abdomen)", () => {
    const seq = [0, 1, 2];
    let i = 0;
    expect(makePassphrase({ ...base, words: 3 }, () => seq[i++ % 3]!)).toBe("abacus-abdomen-abdominal");
  });
  it("supports separators, capitalisation and a trailing digit", () => {
    let i = 0;
    const rand = () => i++;
    expect(makePassphrase({ ...base, words: 3, separator: "space", capitalize: true }, () => rand())).toBe("Abacus Abdomen Abdominal");
    i = 0;
    expect(makePassphrase({ ...base, words: 2, separator: "none", addNumber: true }, () => rand())).toBe("abacusabdomen2");
    i = 0;
    expect(makePassphrase({ ...base, words: 2, separator: "dot", addNumber: true }, () => rand())).toBe("abacus.abdomen.2");
  });
});

describe("entropy", () => {
  it("is words × log2(7776) plus ~3.32 bits for a digit", () => {
    expect(entropyBits(6, 7776, false)).toBeCloseTo(77.55, 2);
    expect(entropyBits(6, 7776, true)).toBeCloseTo(80.87, 2);
  });
  it("labels strength bands", () => {
    expect([40, 55, 70, 90, 120].map(strengthLabel)).toEqual(["weak", "fair", "good", "strong", "very strong"]);
  });
});

describe("generatePassphrases", () => {
  it("returns the requested number of passphrases plus the entropy note", () => {
    // use a space separator: the EFF list contains hyphenated words such as "t-shirt"
    const out = generatePassphrases("", { ...base, separator: "space" }).output.split("\n");
    expect(out.slice(0, 3).every((l) => l.split(" ").length === 6)).toBe(true);
    expect(out.join("\n")).toContain("77.5 bits");
  });
  it("clamps words and count, and warns about short passphrases", () => {
    const out = generatePassphrases("", { ...base, words: 1, count: 99, separator: "space" }).output;
    expect(out.split("\n").slice(0, 20).every((l) => l.split(" ").length === 3)).toBe(true);
    expect(out.split("\n")[20]!.split(" ")).not.toHaveLength(3);
    expect(out).toContain("at least 5 words");
  });
});
