import { describe, expect, it } from "vitest";
import { NANOID_DEFAULT_ALPHABET, decodeUlid, encodeUlid, generateIds, nanoid } from "./transform";

const gen = { mode: "generate", kind: "ulid", count: 3, length: 21, alphabet: "", lowercase: false } as const;

describe("ULID", () => {
  it("encodes timestamp and randomness in Crockford Base32", () => {
    expect(encodeUlid(0, new Uint8Array(10))).toBe("00000000000000000000000000");
    expect(encodeUlid(2 ** 48 - 1, new Uint8Array(10).fill(255))).toBe("7ZZZZZZZZZZZZZZZZZZZZZZZZZ");
    expect(encodeUlid(1_469_918_176_385, new Uint8Array(10))).toBe("01ARYZ6S410000000000000000");
  });
  it("round-trips through decode", () => {
    const rand = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const d = decodeUlid(encodeUlid(1_700_000_000_000, rand));
    expect(d.timeMs).toBe(1_700_000_000_000);
    expect(d.iso).toBe("2023-11-14T22:13:20.000Z");
    expect(d.randomnessHex).toBe("0102030405060708090a");
  });
  it("sorts lexicographically by time", () => {
    const a = encodeUlid(1000, new Uint8Array(10));
    const b = encodeUlid(1001, new Uint8Array(10));
    expect(a < b).toBe(true);
  });
  it("rejects invalid ULIDs and out-of-range times", () => {
    expect(() => decodeUlid("nope")).toThrow();
    expect(() => decodeUlid("8ZZZZZZZZZZZZZZZZZZZZZZZZZ")).toThrow(/overflow/);
    expect(() => decodeUlid("01ARYZ6S41000000000000000I")).toThrow(); // I is not Crockford
    expect(() => encodeUlid(-1, new Uint8Array(10))).toThrow();
  });
  it("accepts lowercase when decoding", () => {
    expect(decodeUlid("01arysxz6s410000000000000000".slice(0, 26)).timeMs).toBeGreaterThan(0);
  });
});

describe("nanoid", () => {
  it("produces the requested length from the alphabet only", () => {
    const id = nanoid(30, "abc");
    expect(id).toHaveLength(30);
    expect(id).toMatch(/^[abc]+$/);
  });
  it("is unbiased: every alphabet char appears roughly equally", () => {
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (const ch of nanoid(30_000, "abc")) counts[ch]!++;
    for (const n of Object.values(counts)) expect(n).toBeGreaterThan(9_000);
  });
  it("uses the injected random source deterministically", () => {
    expect(nanoid(4, "0123456789abcdef", () => Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBe("0123");
  });
  it("validates the alphabet and ignores duplicate characters", () => {
    expect(() => nanoid(5, "a")).toThrow();
    expect(() => nanoid(5, "x".repeat(300))).toThrow();
    expect(nanoid(50, "aab")).toMatch(/^[ab]{50}$/);
  });
  it("default alphabet has 64 distinct URL-safe characters", () => {
    expect(new Set(NANOID_DEFAULT_ALPHABET).size).toBe(64);
    expect(NANOID_DEFAULT_ALPHABET).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("generateIds", () => {
  it("generates ULIDs (optionally lowercase) and NanoIDs", () => {
    const ulids = generateIds("", gen).output.split("\n");
    expect(ulids).toHaveLength(3);
    for (const u of ulids) expect(u).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(generateIds("", { ...gen, lowercase: true }).output).toMatch(/^[0-9a-z]{26}/);
    const nano = generateIds("", { ...gen, kind: "nanoid", length: 10, count: 2 }).output.split("\n");
    expect(nano.every((n) => n.length === 10)).toBe(true);
  });
  it("embeds the current time in generated ULIDs", () => {
    const before = Date.now();
    const t = decodeUlid(generateIds("", { ...gen, count: 1 }).output).timeMs;
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(Date.now());
  });
  it("clamps count and surfaces alphabet errors", () => {
    expect(generateIds("", { ...gen, count: 5000 }).output.split("\n")).toHaveLength(1000);
    expect(generateIds("", { ...gen, kind: "nanoid", alphabet: "a" }).error).not.toBeNull();
  });
  it("decodes ULIDs from input", () => {
    const out = generateIds("01ARYZ6S410000000000000000", { ...gen, mode: "decode" }).output;
    expect(out).toContain("2016-07-30T22:36:16.385Z");
    expect(generateIds("bad", { ...gen, mode: "decode" }).error).not.toBeNull();
    expect(generateIds("", { ...gen, mode: "decode" })).toEqual({ output: "", error: null });
  });
});
