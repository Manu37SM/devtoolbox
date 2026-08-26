import type { LoremIpsumOptions } from "./schema";

const WORD_BANK = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do",
  "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "enim",
  "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi",
  "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "in", "reprehenderit",
  "voluptate", "velit", "esse", "cillum", "eu", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia", "deserunt",
  "mollit", "anim", "id", "est", "laborum",
];

export function generateLoremIpsum(options: LoremIpsumOptions, seed = Date.now()): string {
  const rng = mulberry32(seed);
  const pickWord = () => WORD_BANK[Math.floor(rng() * WORD_BANK.length)]!;

  const makeSentence = (wordCount: number) => {
    const words = Array.from({ length: wordCount }, pickWord);
    const sentence = words.join(" ");
    return capitalize(sentence) + ".";
  };

  const makeParagraph = (sentenceCount: number) =>
    Array.from({ length: sentenceCount }, () => makeSentence(6 + Math.floor(rng() * 10))).join(" ");

  switch (options.unit) {
    case "words": {
      const words = Array.from({ length: options.count }, pickWord);
      if (options.startWithLoremIpsum && options.count >= 2) {
        words[0] = "lorem";
        words[1] = "ipsum";
      }
      return capitalize(words.join(" ")) + ".";
    }
    case "sentences": {
      const sentences = Array.from({ length: options.count }, () => makeSentence(6 + Math.floor(rng() * 10)));
      if (options.startWithLoremIpsum) {
        sentences[0] = capitalize(
          ["lorem", "ipsum", "dolor", "sit", "amet"].join(" "),
        ) + ".";
      }
      return sentences.join(" ");
    }
    case "list-items": {
      const items = Array.from({ length: options.count }, () => makeSentence(4 + Math.floor(rng() * 6)));
      return items.map((item) => `- ${item}`).join("\n");
    }
    case "paragraphs":
    default: {
      const paragraphs = Array.from({ length: options.count }, () => makeParagraph(3 + Math.floor(rng() * 4)));
      if (options.startWithLoremIpsum) {
        paragraphs[0] =
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " + paragraphs[0];
      }
      return paragraphs.join("\n\n");
    }
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
