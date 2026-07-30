// Smart-paste detection for the command palette (FEATURE.md cross-cutting
// feature: "Detects clipboard/paste content shape... and suggests the
// matching tool"). Pure string heuristics, no dependencies — order matters
// (more specific patterns checked first) since e.g. a JWT is technically
// also base64-ish.
export interface SmartDetection {
  toolSlug: string;
  reason: string;
}

const DETECTORS: Array<{ test: (s: string) => boolean; toolSlug: string; reason: string }> = [
  {
    test: (s) => /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s.trim()),
    toolSlug: "jwt-decoder",
    reason: "This looks like a JWT",
  },
  {
    test: (s) => /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(s.trim()),
    toolSlug: "color-converter",
    reason: "This looks like a hex color",
  },
  {
    test: (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim()),
    toolSlug: "uuid-generator",
    reason: "This looks like a UUID",
  },
  {
    test: (s) => /^\d{10}$|^\d{13}$/.test(s.trim()),
    toolSlug: "unix-timestamp",
    reason: "This looks like a Unix timestamp",
  },
  {
    test: (s) => {
      const t = s.trim();
      return t.length > 0 && (t.startsWith("{") || t.startsWith("[")) && isParseableJson(t);
    },
    toolSlug: "json-formatter",
    reason: "This looks like JSON",
  },
  {
    test: (s) => /^[A-Za-z0-9+/]+={0,2}$/.test(s.trim()) && s.trim().length > 8 && s.trim().length % 4 === 0,
    toolSlug: "base64",
    reason: "This looks like Base64",
  },
];

function isParseableJson(input: string): boolean {
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
}

export function detectToolForContent(input: string): SmartDetection | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  for (const detector of DETECTORS) {
    if (detector.test(trimmed)) {
      return { toolSlug: detector.toolSlug, reason: detector.reason };
    }
  }
  return null;
}
