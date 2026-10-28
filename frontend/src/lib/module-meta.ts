import type { ToolModule } from "@devtoolbox/shared";

export const MODULE_META: Record<ToolModule, { label: string; icon: string; description: string }> = {
  "data-format": { label: "Data Format", icon: "Braces", description: "Format, validate, diff and convert JSON, YAML, XML, CSV and more." },
  encoding: { label: "Encoding & Decoding", icon: "Binary", description: "Base64, URL, hex, JWT and other encoders and decoders." },
  security: { label: "Security & Crypto", icon: "ShieldCheck", description: "Hashes, passwords, certificates, keys and secret scanning." },
  text: { label: "Text & String", icon: "Type", description: "Clean, compare, transform and analyse text." },
  code: { label: "Code Tools", icon: "Code", description: "Formatters, linters and converters for developers." },
  converters: { label: "Converters", icon: "ArrowLeftRight", description: "Units, dates, numbers, currencies and file formats." },
  image: { label: "Image & Graphics", icon: "Image", description: "Compress, convert and edit images in your browser." },
  network: { label: "Network & Web", icon: "Network", description: "IP, DNS, HTTP, CORS and web server tooling." },
  generators: { label: "Generators & Test Data", icon: "Sparkles", description: "Generate config files, test data, IDs and boilerplate." },
  ai: { label: "AI-Powered", icon: "Bot", description: "AI helpers for explaining, generating and summarising." },
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
