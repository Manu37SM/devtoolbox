import { describe, expect, it } from "vitest";
import { generateLoremIpsum } from "./transform";

const base = { unit: "paragraphs" as const, count: 3, startWithLoremIpsum: true };

describe("generateLoremIpsum", () => {
  it("is deterministic for a given seed", () => {
    const a = generateLoremIpsum(base, 42);
    const b = generateLoremIpsum(base, 42);
    expect(a).toBe(b);
  });

  it("produces different output for different seeds", () => {
    const a = generateLoremIpsum(base, 1);
    const b = generateLoremIpsum(base, 2);
    expect(a).not.toBe(b);
  });

  it("generates the requested number of paragraphs", () => {
    const result = generateLoremIpsum({ ...base, count: 4 }, 1);
    expect(result.split("\n\n")).toHaveLength(4);
  });

  it("starts with 'Lorem ipsum' when requested for paragraphs", () => {
    const result = generateLoremIpsum(base, 1);
    expect(result.startsWith("Lorem ipsum")).toBe(true);
  });

  it("generates the requested number of words", () => {
    const result = generateLoremIpsum({ unit: "words", count: 10, startWithLoremIpsum: false }, 1);
    expect(result.replace(/\.$/, "").split(" ")).toHaveLength(10);
  });

  it("generates list items prefixed with a dash", () => {
    const result = generateLoremIpsum({ unit: "list-items", count: 3, startWithLoremIpsum: false }, 1);
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
    for (const line of lines) expect(line.startsWith("- ")).toBe(true);
  });

  it("generates the requested number of sentences", () => {
    const result = generateLoremIpsum({ unit: "sentences", count: 5, startWithLoremIpsum: false }, 1);
    const sentenceCount = (result.match(/\./g) ?? []).length;
    expect(sentenceCount).toBe(5);
  });
});
