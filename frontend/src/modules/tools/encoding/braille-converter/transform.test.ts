import { describe, expect, it } from "vitest";
import { BRAILLE_ASCII, asciiToUnicode, brailleConverter, decodeBraille, encodeBraille, unicodeToAscii } from "./transform";

const enc = (t: string) => encodeBraille(t).cells;
const dec = (c: string) => decodeBraille(c).text;
const cellOf = (...d: number[]) => String.fromCodePoint(0x2800 + d.reduce((a, n) => a | (1 << (n - 1)), 0));

// The standard alphabet, written independently as dot numbers.
const ALPHABET: Record<string, number[]> = {
  a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4], j: [2, 4, 5],
  k: [1, 3], l: [1, 2, 3], m: [1, 3, 4], n: [1, 3, 4, 5], o: [1, 3, 5], p: [1, 2, 3, 4], q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5], s: [2, 3, 4], t: [2, 3, 4, 5],
  u: [1, 3, 6], v: [1, 2, 3, 6], w: [2, 4, 5, 6], x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6], z: [1, 3, 5, 6],
};

describe("alphabet", () => {
  it("matches the standard dot patterns", () => {
    for (const [l, d] of Object.entries(ALPHABET)) expect(enc(l), l).toBe(cellOf(...d));
  });
  it("Braille ASCII table is a 64-entry permutation and agrees with the alphabet", () => {
    expect(BRAILLE_ASCII.length).toBe(64);
    expect(new Set(BRAILLE_ASCII).size).toBe(64);
    for (const [l, d] of Object.entries(ALPHABET)) expect(unicodeToAscii(cellOf(...d)), l).toBe(l.toUpperCase());
  });
});

describe("encode", () => {
  it("hello world", () => {
    expect(enc("hello world")).toBe("⠓⠑⠇⠇⠕⠀⠺⠕⠗⠇⠙");
  });
  it("capitals: single, word, mixed", () => {
    expect(enc("Hi")).toBe("⠠⠓⠊");
    expect(enc("NASA")).toBe("⠠⠠⠝⠁⠎⠁");
    expect(enc("McDonald")).toBe("⠠⠍⠉⠠⠙⠕⠝⠁⠇⠙");
    expect(dec(enc("ABc"))).toBe("ABc");
  });
  it("numbers get one indicator; a–j after digits get a letter indicator", () => {
    expect(enc("42")).toBe("⠼⠙⠃");
    expect(enc("3.14")).toBe("⠼⠉⠨⠁⠙");
    expect(enc("5a")).toBe("⠼⠑⠰⠁");
    expect(enc("5k")).toBe("⠼⠑⠅");
  });
  it("punctuation", () => {
    expect(enc("Hi, you!")).toBe("⠠⠓⠊⠂⠀⠽⠕⠥⠖");
    expect(enc("(a)")).toBe("⠐⠣⠁⠐⠜");
  });
  it("unsupported characters are kept with a note", () => {
    const r = encodeBraille("a€");
    expect(r.cells).toBe("⠁€");
    expect(r.notes[0]).toMatch(/€/);
  });
});

describe("decode and round trips", () => {
  it("decodes known strings", () => {
    expect(dec("⠓⠑⠇⠇⠕⠀⠺⠕⠗⠇⠙")).toBe("hello world");
    expect(dec("⠼⠁⠃⠉")).toBe("123");
    expect(dec("⠼⠉⠨⠁⠙")).toBe("3.14");
  });
  it("round-trips mixed text", () => {
    for (const t of ["The quick brown fox, 42 times!", "Call 911 now.", "NASA and ESA", "a-b c;d:e", "Is it 5a or 5b?", "He said “hi” (twice).", "x+y=z", "50% of #1 & [2]"]) {
      expect(dec(enc(t)), t).toBe(t);
    }
  });
  it("round-trips random letters/digits/punctuation", () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJ0123456789 .,;:!-'";
    for (let n = 0; n < 300; n++) {
      let t = "";
      for (let i = 0; i < 12; i++) t += alphabet[Math.floor(rnd() * alphabet.length)];
      t = t.trim().replace(/ +/g, " ");
      // "." and "," between digits are numeric punctuation; skip that ambiguity
      if (/\d[.,]\d/.test(t)) continue;
      expect(dec(enc(t)), t).toBe(t);
    }
  });
});

describe("Braille ASCII", () => {
  it("converts both ways", () => {
    expect(unicodeToAscii("⠓⠑⠇⠇⠕")).toBe("HELLO");
    expect(asciiToUnicode("HELLO")).toBe("⠓⠑⠇⠇⠕");
    expect(asciiToUnicode("hello")).toBe("⠓⠑⠇⠇⠕");
  });
  it("all 64 cells round-trip", () => {
    for (let b = 0; b < 64; b++) {
      const u = String.fromCodePoint(0x2800 + b);
      expect(asciiToUnicode(unicodeToAscii(u))).toBe(u);
    }
  });
  it("tool modes", () => {
    expect(brailleConverter("Hi", { cells: "ascii" }).output).toBe(",HI");
    expect(brailleConverter(",HI", { mode: "decode", cells: "ascii" }).output).toBe("Hi");
    expect(brailleConverter("a", { dots: true }).output).toMatch(/dots 1 /);
    expect(brailleConverter("").output).toBe("");
  });
});
