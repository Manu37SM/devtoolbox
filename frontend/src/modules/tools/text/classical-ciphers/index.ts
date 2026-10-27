import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const classicalCiphersTool: ToolRegistryEntry = {
  slug: "classical-ciphers",
  name: "Classical Ciphers",
  module: "text",
  description: "ROT13, Caesar, Atbash, ROT47 and Vigenère encode/decode — for puzzles and CTFs, not real security.",
  aliases: ["rot13","caesar cipher","vigenere cipher","atbash","rot47"],
  icon: "KeyRound",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["rot13","caesar cipher","vigenere cipher","atbash","rot47"] },
};
