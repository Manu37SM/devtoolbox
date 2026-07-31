import type { ToolModule } from "@devtoolbox/shared";

// Display metadata for the left nav's module groups (UI_GUIDELINES.md §3).
// Order here is the nav's display order and matches FEATURE.md's module
// numbering. Only modules that currently have at least one shipped tool
// need an icon that resolves — network/ai are included now (Phase 2/3
// scope) so the nav doesn't need a follow-up edit when their first tool
// ships.
export const MODULE_META: Record<ToolModule, { label: string; icon: string }> = {
  "data-format": { label: "Data Format", icon: "Braces" },
  encoding: { label: "Encoding & Decoding", icon: "Binary" },
  security: { label: "Security & Crypto", icon: "ShieldCheck" },
  text: { label: "Text & String", icon: "Type" },
  code: { label: "Code Tools", icon: "Code2" },
  converters: { label: "Converters", icon: "ArrowLeftRight" },
  image: { label: "Image & Graphics", icon: "Image" },
  network: { label: "Network & Web", icon: "Network" },
  generators: { label: "Generators & Test Data", icon: "Sparkles" },
  ai: { label: "AI-Powered", icon: "Bot" },
};

// Fixed display order (FEATURE.md module order), independent of object
// key iteration order.
export const MODULE_ORDER: ToolModule[] = [
  "data-format",
  "encoding",
  "security",
  "text",
  "code",
  "converters",
  "image",
  "network",
  "generators",
  "ai",
];
