import type { PlaceholderTextOptions, PlaceholderTextVariant } from "./schema";

export interface PlaceholderTextResult {
  output: string;
  error: { message: string } | null;
}

const WORD_BANKS: Record<PlaceholderTextVariant, string[]> = {
  hipster: [
    "artisan", "kombucha", "vinyl", "cold-pressed", "tote bag", "fixie", "typewriter", "microdosing",
    "single-origin", "letterpress", "tousled", "vegan", "meditation", "gastropub", "small batch",
    "flannel", "kale", "raw denim", "farm-to-table", "chillwave", "banh mi", "poutine", "hexagon",
    "activated charcoal", "normcore", "polaroid", "succulents", "cornhole", "everyday carry",
    "distillery", "sartorial", "roof party", "pop-up", "listicle", "cred", "keffiyeh",
  ],
  corporate: [
    "synergy", "leverage", "bandwidth", "circle back", "low-hanging fruit", "paradigm shift",
    "actionable insights", "move the needle", "deep dive", "value-add", "core competency",
    "streamline", "disrupt", "scalable", "growth hacking", "ideate", "touch base", "bake in",
    "north star", "stakeholder alignment", "best practice", "boil the ocean", "onboard",
    "operationalize", "thought leadership", "holistic approach", "ecosystem", "empower",
    "cross-functional", "double-click on that", "quick win", "run it up the flagpole",
  ],
  bacon: [
    "bacon", "pork belly", "brisket", "sirloin", "ham", "sausage", "ribeye", "pastrami", "salami",
    "prosciutto", "chuck", "short loin", "tri-tip", "turducken", "meatloaf", "corned beef",
    "pork loin", "beef ribs", "andouille", "pancetta", "chicken", "ground round", "jerky",
    "spare ribs", "capicola", "t-bone", "flank", "swine", "shank", "picanha", "biltong",
  ],
};

const OPENERS: Record<PlaceholderTextVariant, string> = {
  hipster: "Hipster ipsum",
  corporate: "Let's",
  bacon: "Bacon ipsum dolor amet",
};

function pick(bank: string[], rng: () => number): string {
  return bank[Math.floor(rng() * bank.length) % bank.length]!;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function buildSentence(variant: PlaceholderTextVariant, wordCount: number, rng: () => number): string {
  const bank = WORD_BANKS[variant];
  const words = Array.from({ length: wordCount }, () => pick(bank, rng));
  const sentence = `${OPENERS[variant]} ${words.join(", ")}.`;
  return capitalize(sentence);
}

function buildParagraph(variant: PlaceholderTextVariant, sentenceCount: number, rng: () => number): string {
  return Array.from({ length: sentenceCount }, () => buildSentence(variant, 6, rng)).join(" ");
}

export function generatePlaceholderText(
  options: PlaceholderTextOptions,
  rng: () => number = Math.random,
): PlaceholderTextResult {
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 50) {
    return { output: "", error: { message: "Count must be an integer between 1 and 50." } };
  }

  const bank = WORD_BANKS[options.variant];

  if (options.unit === "words") {
    const words = Array.from({ length: options.count }, () => pick(bank, rng));
    return { output: words.join(" "), error: null };
  }

  if (options.unit === "sentences") {
    const sentences = Array.from({ length: options.count }, () => buildSentence(options.variant, 6, rng));
    return { output: sentences.join(" "), error: null };
  }

  const paragraphs = Array.from({ length: options.count }, () => buildParagraph(options.variant, 4, rng));
  return { output: paragraphs.join("\n\n"), error: null };
}
