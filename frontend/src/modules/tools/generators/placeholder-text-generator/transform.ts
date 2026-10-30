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

function buildSentence(variant: PlaceholderTextVariant, wordCount: number, rng: () => number, withOpener = true): string {
  const bank = WORD_BANKS[variant];
  const words = Array.from({ length: wordCount }, () => pick(bank, rng));
  const sentence = withOpener ? `${OPENERS[variant]} ${words.join(", ")}.` : `${words.join(", ")}.`;
  return capitalize(sentence);
}

function buildParagraph(
  variant: PlaceholderTextVariant,
  sentenceCount: number,
  rng: () => number,
  opener: (index: number) => boolean,
  wordsPerSentence = 6,
  offset = 0,
): string {
  return Array.from({ length: sentenceCount }, (_, i) => buildSentence(variant, wordsPerSentence, rng, opener(offset + i))).join(" ");
}

function wrap(blocks: string[], format: PlaceholderTextOptions["format"] | undefined, sep: string): string {
  if (format === "html") return blocks.map((b) => `<p>${b}</p>`).join("\n");
  return blocks.join(sep);
}

export function generatePlaceholderText(
  options: Partial<PlaceholderTextOptions> & Pick<PlaceholderTextOptions, "variant" | "unit" | "count">,
  rng: () => number = Math.random,
): PlaceholderTextResult {
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 50) {
    return { output: "", error: { message: "Count must be an integer between 1 and 50." } };
  }

  const bank = WORD_BANKS[options.variant];

  if (options.unit === "words") {
   const words: string[] = [];
   while (words.length < options.count) {
     words.push(...pick(bank, rng).split(" "));
   }
   return { output: words.slice(0, options.count).join(" "), error: null };
  }

  const mode = options.opener ?? "every";
  const opener = (i: number) => mode === "every" || (mode === "first" && i === 0);
  const wps = options.wordsPerSentence ?? 6;

  if (options.unit === "sentences") {
    const sentences = Array.from({ length: options.count }, (_, i) => buildSentence(options.variant, wps, rng, opener(i)));
    return { output: wrap([sentences.join(" ")], options.format, " "), error: null };
  }

  const spp = options.sentencesPerParagraph ?? 4;
  const paragraphs = Array.from({ length: options.count }, (_, p) => buildParagraph(options.variant, spp, rng, opener, wps, p * spp));
  return { output: wrap(paragraphs, options.format, "\n\n"), error: null };
}
