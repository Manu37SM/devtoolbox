import type { CaseConverterOptions } from "./schema";

export function convertCase(input: string, options: CaseConverterOptions): string {
  if (input.trim().length === 0) return "";

  const words = tokenize(input);
  switch (options.target) {
    case "camel":
      return words
        .map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w)))
        .join("");
    case "pascal":
      return words.map(capitalize).join("");
    case "snake":
      return words.map((w) => w.toLowerCase()).join("_");
    case "kebab":
      return words.map((w) => w.toLowerCase()).join("-");
    case "constant":
      return words.map((w) => w.toUpperCase()).join("_");
    case "title":
      return words.map(capitalize).join(" ");
    case "sentence":
      return words.map((w, i) => (i === 0 ? capitalize(w) : w.toLowerCase())).join(" ");
    case "upper":
      return words.join(" ").toUpperCase();
    case "lower":
      return words.join(" ").toLowerCase();
  }
}

function tokenize(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
