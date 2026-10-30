import { describe, expect, it } from "vitest";
import { generatePlaceholderText } from "./transform";

function fakeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++ % sequence.length]!;
}

describe("generatePlaceholderText", () => {
  it("generates the requested word count", () => {
    const result = generatePlaceholderText({ variant: "hipster", unit: "words", count: 5 }, fakeRng([0, 0.2, 0.4, 0.6, 0.8]));
    expect(result.error).toBeNull();
    expect(result.output.split(" ")).toHaveLength(5);
  });

  it("generates the requested sentence count, each ending in a period", () => {
    const result = generatePlaceholderText({ variant: "corporate", unit: "sentences", count: 3 }, fakeRng([0.1]));
    const sentences = result.output.split(". ").filter(Boolean);
    expect(sentences).toHaveLength(3);
    expect(result.output.trim().endsWith(".")).toBe(true);
  });

  it("generates the requested paragraph count, separated by blank lines", () => {
    const result = generatePlaceholderText({ variant: "bacon", unit: "paragraphs", count: 2 }, fakeRng([0.3]));
    expect(result.output.split("\n\n")).toHaveLength(2);
  });

  it("uses words from the requested variant's bank", () => {
    const result = generatePlaceholderText({ variant: "bacon", unit: "words", count: 10 }, fakeRng([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]));
    expect(result.output.toLowerCase()).toMatch(/bacon|pork|brisket|sirloin|ham|sausage|ribeye|pastrami|salami|prosciutto/);
  });

  it("errors on an out-of-range count", () => {
    expect(generatePlaceholderText({ variant: "hipster", unit: "words", count: 0 }).error).not.toBeNull();
    expect(generatePlaceholderText({ variant: "hipster", unit: "words", count: 51 }).error).not.toBeNull();
  });

  it("defaults to Math.random when no rng is supplied", () => {
    const result = generatePlaceholderText({ variant: "hipster", unit: "words", count: 3 });
    expect(result.error).toBeNull();
    expect(result.output.split(" ")).toHaveLength(3);
  });
});

describe("placeholder text options", () => {
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const base = { variant: "hipster", unit: "paragraphs", count: 2 } as const;

  it("controls the opener", () => {
    expect(generatePlaceholderText({ ...base, opener: "every" }, rng).output.match(/Hipster ipsum/g)).toHaveLength(8);
    expect(generatePlaceholderText({ ...base, opener: "first" }, rng).output.match(/Hipster ipsum/g)).toHaveLength(1);
    expect(generatePlaceholderText({ ...base, opener: "none" }, rng).output).not.toContain("Hipster ipsum");
  });

  it("sets sentence and paragraph length", () => {
    const out = generatePlaceholderText({ ...base, count: 1, opener: "none", wordsPerSentence: 3, sentencesPerParagraph: 2 }, rng).output;
    expect(out.split(". ").length).toBe(2);
    expect(out.split(".")[0]!.split(", ")).toHaveLength(3);
  });

  it("wraps paragraphs as HTML", () => {
    const out = generatePlaceholderText({ ...base, format: "html" }, rng).output;
    expect(out.split("\n")).toHaveLength(2);
    expect(out.startsWith("<p>") && out.endsWith("</p>")).toBe(true);
  });
});

