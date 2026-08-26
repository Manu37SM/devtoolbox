import type { ToolModule } from "@devtoolbox/shared";

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
