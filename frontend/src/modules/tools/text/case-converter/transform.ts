import type { CaseConverterOptions, CaseTarget } from "./schema";

/** Targets that build an identifier, where punctuation is a word separator. */
const IDENTIFIER: ReadonlySet<CaseTarget> = new Set(["camel", "pascal", "snake", "kebab", "constant", "dot", "path", "train"]);

/** Chicago-style minor words kept lower-case in smart title case. */
const MINOR = new Set(
  "a an and as at but by en for if in nor of on or per the to v vs via with".split(" "),
);

export function convertCase(input: string, options: Partial<CaseConverterOptions> & Pick<CaseConverterOptions, "target">): string {
  if (input.trim().length === 0) return "";
  if (options.perLine) {
    return input
      .split(/\r?\n/)
      .map((line) => (line.trim() ? convertOne(line, options) : ""))
      .join("\n");
  }
  return convertOne(input, options);
}

function convertOne(input: string, o: Partial<CaseConverterOptions> & Pick<CaseConverterOptions, "target">): string {
  const words = tokenize(input, IDENTIFIER.has(o.target), o.splitDigits ?? false);
  if (words.length === 0) return "";
  const acr = o.preserveAcronyms ?? false;
  const cap = (w: string) => (acr && isAcronym(w) ? w : capitalize(w));
  const low = (w: string) => (acr && isAcronym(w) ? w : w.toLowerCase());

  switch (o.target) {
    case "camel":
      return words.map((w, i) => (i === 0 ? w.toLowerCase() : cap(w))).join("");
    case "pascal":
      return words.map(cap).join("");
    case "snake":
      return words.map((w) => w.toLowerCase()).join("_");
    case "kebab":
      return words.map((w) => w.toLowerCase()).join("-");
    case "constant":
      return words.map((w) => w.toUpperCase()).join("_");
    case "dot":
      return words.map((w) => w.toLowerCase()).join(".");
    case "path":
      return words.map((w) => w.toLowerCase()).join("/");
    case "train":
      return words.map(cap).join("-");
    case "title":
      return words
        .map((w, i) => {
          const bare = w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
          if (o.smartTitle && i > 0 && i < words.length - 1 && MINOR.has(bare)) return w.toLowerCase();
          return cap(w);
        })
        .join(" ");
    case "sentence":
      return words.map((w, i) => (i === 0 ? cap(w) : low(w))).join(" ");
    case "upper":
      return words.join(" ").toUpperCase();
    case "lower":
      return words.join(" ").toLowerCase();
  }
}

function tokenize(input: string, identifier: boolean, splitDigits: boolean): string[] {
  let s = input
    // fooBar, foo2Bar -> foo Bar
    .replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, "$1 $2")
    // XMLHttpRequest -> XML Http Request (an acronym followed by a capitalised word)
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1 $2");
  if (splitDigits) s = s.replace(/(\p{L})(\p{N})/gu, "$1 $2").replace(/(\p{N})(\p{L})/gu, "$1 $2");
  s = identifier ? s.replace(/[^\p{L}\p{N}]+/gu, " ") : s.replace(/[_-]+/g, " ");
  return s.trim().split(/\s+/).filter(Boolean);
}

function isAcronym(word: string): boolean {
  return word.length > 1 && /^\p{Lu}+\d*$/u.test(word);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
