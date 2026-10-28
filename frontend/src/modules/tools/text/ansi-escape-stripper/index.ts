import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ansiEscapeStripperTool: ToolRegistryEntry = {
  slug: "ansi-escape-stripper",
  name: "ANSI Escape Code Stripper & Viewer",
  module: "text",
  description: "Remove ANSI colour and cursor codes from terminal output and CI logs, render them as coloured HTML, or inspect which sequences are present. Also handles pasted literals like \\x1b[31m.",
  aliases: ["strip ansi codes","remove color codes","terminal output cleaner","ansi to html","ci log cleaner"],
  icon: "Eraser",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["strip ansi codes","remove color codes","terminal output cleaner","ansi to html","ci log cleaner"] },
};
