import { describe, expect, it } from "vitest";
import { atbash, caesar, convertCipher, rot47, vigenere } from "./transform";

const base = { mode: "encrypt", cipher: "caesar", shift: 3, key: "KEY" } as const;

describe("caesar", () => {
  it("shifts letters and keeps case and punctuation", () => {
    expect(caesar("Hello, World!", 3)).toBe("Khoor, Zruog!");
  });
  it("wraps and handles negative shifts", () => {
    expect(caesar("xyz", 3)).toBe("abc");
    expect(caesar("abc", -3)).toBe("xyz");
    expect(caesar("abc", 29)).toBe("def");
  });
});

describe("other ciphers", () => {
  it("atbash is its own inverse", () => {
    expect(atbash("Hello")).toBe("Svool");
    expect(atbash(atbash("Round Trip"))).toBe("Round Trip");
  });
  it("rot47 is its own inverse and leaves spaces", () => {
    expect(rot47("Hello World")).toBe("w6==@ (@C=5");
    expect(rot47(rot47("a~!"))).toBe("a~!");
  });
  it("vigenere matches the classic vector and skips non-letters in key stepping", () => {
    expect(vigenere("ATTACKATDAWN", "LEMON", false)).toBe("LXFOPVEFRNHR");
    expect(vigenere("LXFOPVEFRNHR", "LEMON", true)).toBe("ATTACKATDAWN");
    expect(vigenere("Hi, you", "b", false)).toBe("Ij, zpv");
  });
});

describe("convertCipher", () => {
  it("rot13 ignores mode and shift", () => {
    expect(convertCipher("Hello", { ...base, cipher: "rot13" }).output).toBe("Uryyb");
    expect(convertCipher("Uryyb", { ...base, cipher: "rot13", mode: "decrypt" }).output).toBe("Hello");
  });
  it("caesar decrypt reverses encrypt", () => {
    const e = convertCipher("Attack at dawn", base).output;
    expect(convertCipher(e, { ...base, mode: "decrypt" }).output).toBe("Attack at dawn");
  });
  it("vigenere requires a letter key", () => {
    expect(convertCipher("abc", { ...base, cipher: "vigenere", key: "123" }).error).not.toBeNull();
  });
  it("empty input gives empty output", () => {
    expect(convertCipher("", base)).toEqual({ output: "", error: null });
  });
});
